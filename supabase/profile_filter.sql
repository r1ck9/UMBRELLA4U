-- ============================================================
--  Umbrella — extend the word filter to PROFILES.
--  Run once in Supabase SQL Editor, AFTER word_filter_v2.sql
--  (this reuses norm_text() and the blocked_terms table from it).
--  Safe to re-run.
--
--  Screens username, display name, pronouns, status, about-me, and tags
--  with the SAME leet-aware logic as stories — so "sh1t", "f u c k",
--  and "xxfaggotxx" are all rejected in a bio or username too.
-- ============================================================

-- Shared check: does this text contain a blocked term? (leet + hidden aware)
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
  -- whole-word terms — matched on the original text with word boundaries
  select '\y(' || string_agg(term, '|') || ')\y' into word_pattern
    from blocked_terms where match_type = 'word';
  if word_pattern is not null and t ~* word_pattern then
    return true;
  end if;
  return false;
end $$;

-- Keep stories using the same shared check (so both stay in sync).
create or replace function screen_story() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if contains_blocked(new.text) then
    raise exception using message = 'blocked_content';
  end if;
  return new;
end $$;
drop trigger if exists trg_screen_story on stories;
create trigger trg_screen_story before insert on stories
  for each row execute function screen_story();

-- Screen every user-editable profile field, including tags.
create or replace function screen_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if contains_blocked(new.username)
     or contains_blocked(new.display_name)
     or contains_blocked(new.pronouns)
     or contains_blocked(new.status_weather)
     or contains_blocked(new.about_me)
     or (new.tags is not null and contains_blocked(array_to_string(new.tags, ' ')))
  then
    raise exception using message = 'blocked_content';
  end if;
  return new;
end $$;
drop trigger if exists trg_screen_profile on profiles;
create trigger trg_screen_profile before insert or update on profiles
  for each row execute function screen_profile();
