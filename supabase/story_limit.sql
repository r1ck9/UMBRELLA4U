-- NOTE: the day boundary here is SUPERSEDED by day_boundary_tz.sql
-- (America/Vancouver instead of UTC). Run that after this one.
--
-- Daily post limit — run once in Supabase (SQL Editor). Safe to re-run.
-- Stops anyone posting more than 5 stories per day, enforced in the database
-- so it can't be bypassed from the browser. Change the 5 to adjust the limit
-- (and keep web/lib/config.js DAILY_STORY_LIMIT in sync).

create or replace function enforce_daily_story_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare cnt int;
begin
  select count(*) into cnt
  from stories
  where author_id = auth.uid()
    and created_at >= date_trunc('day', now());   -- resets at UTC midnight

  if cnt >= 5 then
    raise exception using message = 'daily_story_limit';
  end if;

  return new;
end $$;

drop trigger if exists trg_daily_story_limit on stories;
create trigger trg_daily_story_limit before insert on stories
  for each row execute function enforce_daily_story_limit();
