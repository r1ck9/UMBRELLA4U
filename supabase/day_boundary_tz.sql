-- ============================================================
--  Umbrella — fix the "day" boundary. Run once in Supabase SQL Editor.
--  Safe to re-run. SUPERSEDES the day logic in daily_limit.sql,
--  story_limit.sql, and streak.sql.
--
--  THE BUG: those used UTC midnight (date_trunc('day', now()) and
--  now() at time zone 'utc'). UTC midnight is 5 PM in Vancouver, so:
--    • daily umbrella/story limits reset mid-afternoon, not overnight, and
--      disagreed with the UI counter (which used the browser's local midnight);
--    • the streak never counted a late-evening + next-morning visit as two
--      days, because both fell inside one UTC date.
--
--  THE FIX: anchor every "day" to America/Vancouver (the userbase). The UI
--  (lib/day.js APP_TZ) uses the SAME zone, so the counter and the DB agree.
--  When Umbrella grows beyond one region, switch to per-user timezones.
-- ============================================================

-- start of "today" in Vancouver, as a real timestamptz instant
create or replace function app_day_start() returns timestamptz
language sql stable set search_path = public as $$
  select date_trunc('day', now() at time zone 'America/Vancouver')
         at time zone 'America/Vancouver'
$$;

-- ---------- daily umbrella limit (keep 5 in sync with lib/config.js) ----------
create or replace function enforce_daily_umbrella_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare cnt int;
begin
  select count(*) into cnt from umbrellas
  where user_id = auth.uid() and created_at >= app_day_start();
  if cnt >= 5 then
    raise exception using message = 'daily_umbrella_limit';
  end if;
  return new;
end $$;
drop trigger if exists trg_daily_limit on umbrellas;
create trigger trg_daily_limit before insert on umbrellas
  for each row execute function enforce_daily_umbrella_limit();

-- ---------- daily story limit (keep 5 in sync with lib/config.js) ----------
create or replace function enforce_daily_story_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare cnt int;
begin
  select count(*) into cnt from stories
  where author_id = auth.uid() and created_at >= app_day_start();
  if cnt >= 5 then
    raise exception using message = 'daily_story_limit';
  end if;
  return new;
end $$;
drop trigger if exists trg_daily_story_limit on stories;
create trigger trg_daily_story_limit before insert on stories
  for each row execute function enforce_daily_story_limit();

-- ---------- streak: consecutive Vancouver days ----------
create or replace function touch_streak() returns int
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
        last_day date;
        cnt int;
        today date := (now() at time zone 'America/Vancouver')::date;
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
