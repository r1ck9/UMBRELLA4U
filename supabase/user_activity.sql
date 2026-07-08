-- ============================================================
--  Umbrella — daily active users + day-after retention.
--  Run once in Supabase SQL Editor, AFTER day_boundary_tz.sql and
--  activity_graph.sql. Safe to re-run. Moderator-gated reads.
--
--  We log one row per (user, day) — so a person counts ONCE per day no matter
--  how many times they open the site or how many views they rack up. Only
--  signed-in users can be tied to a person, so "active users" = distinct
--  logged-in members. History accrues from the day you run this forward
--  (we previously kept only each user's LAST active date, not a full log).
-- ============================================================

create table if not exists user_activity (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  primary key (user_id, day)
);
alter table user_activity enable row level security;   -- private: no policy → only definer functions read/write it

-- touch_streak already runs on page load for signed-in members; have it also
-- record today's activity (America/Vancouver day, matching everything else).
create or replace function touch_streak() returns int
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
        last_day date;
        cnt int;
        today date := (now() at time zone 'America/Vancouver')::date;
begin
  if uid is null then return 0; end if;
  insert into user_activity (user_id, day) values (uid, today) on conflict do nothing;  -- one row per person per day
  select last_active_date, coalesce(streak_count, 0) into last_day, cnt from profiles where id = uid;
  if last_day = today then
    return cnt;
  elsif last_day = today - 1 then
    cnt := cnt + 1;
  else
    cnt := 1;
  end if;
  update profiles set streak_count = cnt, last_active_date = today where id = uid;
  return cnt;
end $$;

-- Activity-per-day now includes distinct active users (return type changed → drop first).
drop function if exists activity_by_day(int);
create or replace function activity_by_day(days int default 30)
returns table(day date, views bigint, stories bigint, umbrellas bigint, active_users bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_moderator) then
    raise exception using message = 'not_authorized';
  end if;
  return query
  with span as (
    select d::date as day
    from generate_series(
      ((now() at time zone 'America/Vancouver')::date - (greatest(days, 1) - 1))::timestamp,
      (now() at time zone 'America/Vancouver')::date::timestamp,
      interval '1 day'
    ) d
  ),
  st as (select (created_at at time zone 'America/Vancouver')::date day, count(*) c from stories group by 1),
  um as (select (created_at at time zone 'America/Vancouver')::date day, count(*) c from umbrellas group by 1),
  au as (select day, count(*) c from user_activity group by 1)
  select sp.day,
         coalesce(dv.views_real, 0)::bigint,
         coalesce(st.c, 0)::bigint,
         coalesce(um.c, 0)::bigint,
         coalesce(au.c, 0)::bigint
  from span sp
  left join daily_views dv on dv.day = sp.day
  left join st on st.day = sp.day
  left join um on um.day = sp.day
  left join au on au.day = sp.day
  order by sp.day;
end $$;
grant execute on function activity_by_day(int) to anon, authenticated;

-- Day-after retention: of users who registered on/after tracking began (and
-- long enough ago that "the next day" has happened), how many came back the
-- day after they registered. Also returns how many are active today.
create or replace function retention_stats()
returns table(cohort bigint, retained bigint, active_today bigint)
language plpgsql security definer set search_path = public as $$
declare tstart date;
        today date := (now() at time zone 'America/Vancouver')::date;
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_moderator) then
    raise exception using message = 'not_authorized';
  end if;
  select min(day) into tstart from user_activity;
  if tstart is null then
    return query select 0::bigint, 0::bigint, 0::bigint;
    return;
  end if;
  return query
  with c as (
    select p.id, (p.created_at at time zone 'America/Vancouver')::date as rday
    from profiles p
    where (p.created_at at time zone 'America/Vancouver')::date >= tstart
      and (p.created_at at time zone 'America/Vancouver')::date <= today - 1   -- next day must have passed
  ),
  r as (
    select exists (
      select 1 from user_activity ua where ua.user_id = c.id and ua.day = c.rday + 1
    ) as came_back
    from c
  )
  select (select count(*) from r)::bigint,
         (select count(*) from r where came_back)::bigint,
         (select count(*) from user_activity where day = today)::bigint;
end $$;
grant execute on function retention_stats() to authenticated;
