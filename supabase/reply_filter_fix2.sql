-- ============================================================
--  Fix "invalid regular expression: quantifier operand invalid" on replies.
--  Run once in Supabase SQL Editor. Safe to re-run. Includes BOTH fixes so it
--  works whether or not you already ran filter_regex_fix.sql.
--
--  Cause: two functions in the note/story screening path used regex that
--  Postgres rejects.
--    1) contains_blocked() joined blocklist terms into a pattern without
--       escaping regex metacharacters.
--    2) contains_name() used the scoped inline flag form "(?i:...)", which
--       Postgres's regex engine does NOT support (only the whole-expression
--       "(?i)" director is allowed). This raised the error above once a note
--       got past the blocked/PII checks.
-- ============================================================

-- 1) Escape blocklist terms so a metacharacter term can't break the pattern.
create or replace function contains_blocked(t text) returns boolean
language plpgsql stable set search_path = public as $$
declare condensed text; word_pattern text;
begin
  if t is null or t = '' then return false; end if;
  condensed := norm_text(t);
  if exists (
    select 1 from blocked_terms b
    where b.match_type = 'substr'
      and norm_text(b.term) <> ''
      and position(norm_text(b.term) in condensed) > 0
  ) then
    return true;
  end if;
  select '\y(' || string_agg(regexp_replace(term, '([.^$*+?(){}|])', '\\\1', 'g'), '|') || ')\y'
    into word_pattern
    from blocked_terms where match_type = 'word';
  if word_pattern is not null and t ~* word_pattern then
    return true;
  end if;
  return false;
end $$;

-- 2) Detect a name after a greeting/sign-off cue WITHOUT "(?i:...)".
--    The cue is matched case-insensitively with the regexp_match 'i' flag; the
--    captured word keeps its ORIGINAL casing, so we can still require it to be
--    Capitalized (first letter upper, rest lower) to count as a name.
create or replace function contains_name(t text) returns boolean
language plpgsql immutable set search_path = public as $$
declare w text;
begin
  if t is null or t = '' then return false; end if;

  -- @handle mention
  if t ~ '@[A-Za-z][A-Za-z0-9_.]+' then
    return true;
  end if;

  w := (regexp_match(
    t,
    '(?:^|[[:space:]])(?:hi|hey|hello|dear|yo|thanks|thank you|from|love|xoxo|sincerely|regards|best|cheers|[-–—])[[:space:],]+([A-Za-z]+)',
    'i'
  ))[1];

  if w is not null and w ~ '^[A-Z][a-z]+$' and lower(w) not in (
    'you','there','friend','friends','everyone','everybody','all','stranger',
    'buddy','love','team','one','anyone','someone','fam','bestie','god','ok','okay'
  ) then
    return true;
  end if;

  return false;
end $$;
