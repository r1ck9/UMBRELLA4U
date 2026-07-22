-- ============================================================
--  Fix "invalid regular expression: quantifier operand invalid".
--  Run once in Supabase SQL Editor. Safe to re-run.
--
--  contains_blocked() built its whole-word pattern by joining the blocked
--  terms straight into a regex:  '\y(' || string_agg(term,'|') || ')\y'
--  If any 'word' term contains a regex metacharacter (+ * ? ( ) . $ { } |),
--  the generated regex was invalid and Postgres raised the error above,
--  breaking story/profile/reply screening.
--
--  Fix: regex-escape each term before joining, so terms are matched literally.
-- ============================================================

create or replace function contains_blocked(t text) returns boolean
language plpgsql stable set search_path = public as $$
declare condensed text; word_pattern text;
begin
  if t is null or t = '' then return false; end if;
  condensed := norm_text(t);
  -- substring terms — caught even when hidden inside other characters / digits
  if exists (
    select 1 from blocked_terms b
    where b.match_type = 'substr'
      and norm_text(b.term) <> ''
      and position(norm_text(b.term) in condensed) > 0
  ) then
    return true;
  end if;
  -- whole-word terms — matched on the original text with word boundaries.
  -- Escape regex metacharacters in each term so a term like "c++" or "a.b"
  -- is matched literally instead of breaking the pattern.
  select '\y(' || string_agg(regexp_replace(term, '([.^$*+?(){}|])', '\\\1', 'g'), '|') || ')\y'
    into word_pattern
    from blocked_terms where match_type = 'word';
  if word_pattern is not null and t ~* word_pattern then
    return true;
  end if;
  return false;
end $$;
