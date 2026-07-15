-- ============================================================
--  No names in umbrella REPLIES (the one-line notes). Keeps replies anonymous:
--  a reply can't @-mention someone, address someone by name, or sign off with a
--  name. Applies to every umbrella note — normal users AND the owner's
--  reply_as_bot() — because it lives in the existing before-insert screen.
--
--  Run AFTER note_filter.sql / pii_filter.sql (reuses contains_blocked +
--  contains_personal_info). Safe to re-run.
--
--  Names are impossible to detect perfectly, so this targets the actual risk:
--    • @handle mentions            → "@jordan hang in there"
--    • a Capitalized name-word right after a greeting or sign-off cue
--        "Hi Sarah"  "Dear Alex"  "thanks Mia"  "love, Sam"  "— Jordan"
--  An allowlist keeps ordinary words through ("Hi there", "sending love").
-- ============================================================

create or replace function contains_name(t text) returns boolean
language plpgsql immutable set search_path = public as $$
declare w text;
begin
  if t is null or t = '' then return false; end if;

  -- @handle mention
  if t ~ '@[A-Za-z][A-Za-z0-9_.]+' then
    return true;
  end if;

  -- Capitalized word right after a greeting / sign-off cue.
  -- (?i: ...) makes only the cue case-insensitive; the name stays Capitalized.
  w := (regexp_match(
    t,
    '(?:^|[[:space:]])(?:(?i:hi|hey|hello|dear|yo|thanks|thank you|from|love|xoxo|sincerely|regards|best|cheers)|[-–—])[[:space:],]+([A-Z][a-z]+)'
  ))[1];

  if w is not null and lower(w) not in (
    'you','there','friend','friends','everyone','everybody','all','stranger',
    'buddy','love','team','one','anyone','someone','fam','bestie','god','ok','okay'
  ) then
    return true;
  end if;

  return false;
end $$;

-- Re-screen umbrella notes: blocked words, personal info (email), AND names.
create or replace function screen_umbrella_note() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.note is not null and new.note <> '' then
    if contains_blocked(new.note) then
      raise exception using message = 'blocked_content';
    end if;
    if contains_personal_info(new.note) then
      raise exception using message = 'personal_info';
    end if;
    if contains_name(new.note) then
      raise exception using message = 'no_names_in_reply';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_screen_umbrella on umbrellas;
create trigger trg_screen_umbrella before insert on umbrellas
  for each row execute function screen_umbrella_note();

-- quick checks — expect: t, t, t, f, f, f
-- select contains_name('Hi Sarah, you''ve got this');
-- select contains_name('thanks Mia');
-- select contains_name('@jordan hang in there');
-- select contains_name('Hi there, sending love');
-- select contains_name('i hope you find some peace today');
-- select contains_name('you are not alone');
