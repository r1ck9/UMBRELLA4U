-- ============================================================
--  Umbrella — make ACTIVE USERS + REGISTRATIONS actually count in analytics.
--
--  Root cause: the moderator chart (ActivityChart) already asks for and plots
--  `active_users` and `registrations`, but the live activity_by_day() function
--  predates them, so those two columns come back empty and render as flat 0.
--  (The analytics upgrades were never run, or user_activity.sql ran AFTER
--  metrics_v2.sql and reverted activity_by_day to the older column set.)
--
--  This installs the full, final state. Run once in Supabase SQL Editor.
--  Safe to re-run. Assumes daily_views exists (activity_graph.sql).
-- ============================================================

-- 1) daily-active-users log: one row per (member, day)
create table if not exists user_activity (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  primary key (user_id, day)
);
alter table user_activity enable row level security;   -- private: read/write only via definer functions

-- 2) touch_streak(): called on page load for signed-in members — record today's
--    activity AND maintain the streak (America/Vancouver day, like everything else)
create or replace function touch_streak() returns int
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
        last_day date;
        cnt int;
        today date := (now() at time zone 'America/Vancouver')::date;
begin
  if uid is null then return 0; end if;
  insert into user_activity (user_id, day) values (uid, today) on conflict do nothing;
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
grant execute on function touch_streak() to authenticated;

-- 3) BACKFILL real historical activity from actions that carry a member + date,
--    so "active users" has genuine history before today (not just going forward).
insert into user_activity (user_id, day)
  select author_id, (created_at at time zone 'America/Vancouver')::date
  from stories where author_id is not null
on conflict do nothing;
insert into user_activity (user_id, day)
  select user_id, (created_at at time zone 'America/Vancouver')::date from umbrellas
on conflict do nothing;
insert into user_activity (user_id, day)
  select user_id, (created_at at time zone 'America/Vancouver')::date from hugs
on conflict do nothing;
insert into user_activity (user_id, day)
  select id, last_active_date from profiles where last_active_date is not null
on conflict do nothing;

-- 4) the authoritative activity_by_day() — includes active_users AND registrations
drop function if exists activity_by_day(int);
create or replace function activity_by_day(days int default 30)
returns table(day date, views bigint, stories bigint, umbrellas bigint, active_users bigint, registrations bigint)
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
  st as (select (created_at at time zone 'America/Vancouver')::date day, count(*) c from public.stories   group by 1),
  um as (select (created_at at time zone 'America/Vancouver')::date day, count(*) c from public.umbrellas group by 1),
  au as (select day, count(*) c from public.user_activity group by 1),
  rg as (select (created_at at time zone 'America/Vancouver')::date day, count(*) c from public.profiles  group by 1)
  select sp.day,
         coalesce(dv.views_real, 0)::bigint,
         coalesce(st.c, 0)::bigint,
         coalesce(um.c, 0)::bigint,
         coalesce(au.c, 0)::bigint,
         coalesce(rg.c, 0)::bigint
  from span sp
  left join public.daily_views dv on dv.day = sp.day
  left join st on st.day = sp.day
  left join um on um.day = sp.day
  left join au on au.day = sp.day
  left join rg on rg.day = sp.day
  order by sp.day;
end $$;
grant execute on function activity_by_day(int) to anon, authenticated;

-- 5) engagement_stats() — totals incl. total users (registrations to date)
drop function if exists engagement_stats();
create or replace function engagement_stats()
returns table(
  users bigint, posters bigint, never_posted bigint, never_pct numeric,
  stories bigint, umbrellas bigint, replies bigint,
  avg_posts numeric, avg_umbrellas numeric, avg_replies numeric
)
language plpgsql security definer set search_path = public as $$
declare u bigint; p bigint; s bigint; um bigint; rp bigint;
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_moderator) then
    raise exception using message = 'not_authorized';
  end if;
  select count(*) into u  from public.profiles;
  select count(distinct author_id) into p from public.stories where author_id is not null;
  select count(*) into s  from public.stories;
  select count(*) into um from public.umbrellas;
  select count(*) into rp from public.umbrellas where note is not null and btrim(note) <> '';
  return query select
    u, p, (u - p),
    round(((u - p)::numeric / nullif(u, 0)) * 100, 1),
    s, um, rp,
    round(s::numeric  / nullif(u, 0), 2),
    round(um::numeric / nullif(u, 0), 2),
    round(rp::numeric / nullif(u, 0), 2);
end $$;
grant execute on function engagement_stats() to authenticated;
