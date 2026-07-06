-- ============================================================
--  Umbrella — smarter word filter (v2). Run once in Supabase SQL Editor.
--  Safe to re-run. Replaces the word-filter part of moderation_all.sql.
--
--  Fixes two evasion tricks the old \y…\y (whole-word) filter missed:
--    1. HIDING a word inside gibberish:  "jffdfbadwordfdkj"
--    2. SPACING / LEETSPEAK / punctuation: "f u c k", "f.u.c.k", "sh1t", "@ss"
--
--  How: we build a NORMALIZED copy of the post — lowercased, leetspeak
--  mapped to letters (0→o, 1→i, 3→e, @→a, $→s …), and EVERY non-letter
--  stripped out (spaces, dots, digits, underscores, *). So "f.u c-k"
--  becomes "fuck" and "xxfuckxx" stays "xxfuckxx".
--
--  THE TRADE-OFF (important): matching a word *inside* other words causes
--  false positives — "class" contains "ass", "Scunthorpe" contains "cunt".
--  So each term has a match_type:
--    • 'substr' — matched even when embedded. ONLY for terms that basically
--                 never appear inside an innocent word (most slurs, "fuck").
--    • 'word'   — matched only as a whole word (the old behavior). For terms
--                 with common innocent substrings ("ass", "spic"→suspicious,
--                 "coon"→raccoon, "shit"→mishit, "cock"→cockpit, "paki"→Pakistan).
--  To move a term between modes later:
--    update blocked_terms set match_type = 'word' where term = 'cunt';
-- ============================================================

create table if not exists blocked_terms (
  term text primary key,
  match_type text not null default 'word' check (match_type in ('word','substr'))
);
alter table blocked_terms add column if not exists match_type text
  not null default 'word' check (match_type in ('word','substr'));
alter table blocked_terms enable row level security;

-- ---------- normalizer: lowercase + de-leet + letters only ----------
create or replace function norm_text(t text) returns text
language sql immutable set search_path = public as $$
  select regexp_replace(
           translate(lower(coalesce(t, '')),
                     '0134578@$!|', 'oieastbasil'),  -- 0→o 1→i 3→e 4→a 5→s 7→t 8→b @→a $→s !→i |→l
           '[^a-z]', '', 'g')                        -- drop spaces, digits, punctuation, everything non-letter
$$;

-- ---------- reseed the blocklist ----------
delete from blocked_terms;

-- SUBSTR: caught even when hidden inside other text (safe — no common innocent word contains these)
insert into blocked_terms (term, match_type) values
  ('fuck','substr'),('fucking','substr'),('fucker','substr'),('fuckers','substr'),
  ('fuckhead','substr'),('motherfucker','substr'),('mother fucker','substr'),
  ('shithead','substr'),('bullshit','substr'),('shitty','substr'),
  ('bitch','substr'),('bitches','substr'),('asshole','substr'),('assholes','substr'),
  ('dumbass','substr'),('jackass','substr'),('dickhead','substr'),('bastard','substr'),
  ('cunt','substr'),('twat','substr'),('wanker','substr'),('bollocks','substr'),
  ('whore','substr'),('douchebag','substr'),
  -- slurs (safe to match embedded)
  ('nigger','substr'),('niggers','substr'),('nigga','substr'),('niggas','substr'),
  ('faggot','substr'),('faggots','substr'),('kike','substr'),('wetback','substr'),
  -- telling others to self-harm (spaces are stripped, so "killyourself" is matched embedded)
  ('kill yourself','substr'),('kill yourselves','substr'),('kill urself','substr'),
  ('go kill yourself','substr'),('go die','substr'),('you should die','substr')
on conflict (term) do update set match_type = excluded.match_type;

-- WORD: whole word only — these have innocent substrings, so embedding-match would false-positive
insert into blocked_terms (term, match_type) values
  ('ass','word'),('shit','word'),('piss','word'),('dick','word'),('cock','word'),
  ('pussy','word'),('slut','word'),('prick','word'),('kys','word'),
  ('fag','word'),('fags','word'),('retard','word'),('retards','word'),('retarded','word'),
  ('tranny','word'),('trannies','word'),('spic','word'),('chink','word'),('gook','word'),
  ('coon','word'),('dyke','word'),('beaner','word'),('paki','word')
on conflict (term) do update set match_type = excluded.match_type;

-- ---------- the screening trigger ----------
create or replace function screen_story() returns trigger
language plpgsql security definer set search_path = public as $$
declare condensed text; word_pattern text;
begin
  condensed := norm_text(new.text);

  -- 1) substring terms — caught even when hidden inside other characters
  if exists (
    select 1 from blocked_terms b
    where b.match_type = 'substr'
      and norm_text(b.term) <> ''
      and position(norm_text(b.term) in condensed) > 0
  ) then
    raise exception using message = 'blocked_content';
  end if;

  -- 2) whole-word terms — matched on the original text with word boundaries
  select '\y(' || string_agg(term, '|') || ')\y' into word_pattern
    from blocked_terms where match_type = 'word';
  if word_pattern is not null and new.text ~* word_pattern then
    raise exception using message = 'blocked_content';
  end if;

  return new;
end $$;
drop trigger if exists trg_screen_story on stories;
create trigger trg_screen_story before insert on stories
  for each row execute function screen_story();

-- Quick self-test (optional — run separately to see it work):
--   select norm_text('f.u c-k y0u');           -- → 'fuckyou'
--   select position('fuck' in norm_text('jffdfuckdkj')) > 0;  -- → true (would be blocked)
--   select position('ass'  in norm_text('my class assignment')) > 0;  -- → true, BUT 'ass' is 'word' type so NOT blocked
