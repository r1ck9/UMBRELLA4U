-- Umbrella streak — run once in Supabase SQL Editor. Safe to re-run.
-- Counts consecutive days a member "shows up." touch_streak() is called when
-- a logged-in member loads the feed; it's idempotent per day (can't be gamed
-- by refreshing) and resets to 1 after a missed day.
alter table profiles add column if not exists streak_count int not null default 0;
alter table profiles add column if not exists last_active_date date;

create or replace function touch_streak() returns int
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
        last_day date;
        cnt int;
        today date := (now() at time zone 'utc')::date;
begin
  if uid is null then return 0; end if;
  select last_active_date, coalesce(streak_count, 0) into last_day, cnt from profiles where id = uid;
  if last_day = today then
    return cnt;                       -- already counted today
  elsif last_day = today - 1 then
    cnt := cnt + 1;                   -- consecutive day
  else
    cnt := 1;                         -- first day, or streak broke
  end if;
  update profiles set streak_count = cnt, last_active_date = today where id = uid;
  return cnt;
end $$;
