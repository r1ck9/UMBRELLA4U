-- ============================================================
--  Moderation dashboard = HONEST (no bots). Redefines engagement_stats() and
--  activity_by_day() to exclude the bot fleet, so the mod panel's registrations,
--  total users, active users, stories and umbrellas all count REAL users only.
--
--  Run this LAST — it supersedes the bot-including versions in metrics_v2.sql /
--  analytics_active_and_registrations.sql / engagement_stats.sql. Safe to re-run.
--  (The public community banner stays inflated — that's community_weather.sql.)
-- ============================================================

drop function if exists engagement_stats();
create or replace function engagement_stats()
returns table(users bigint, posters bigint, never_posted bigint, never_pct numeric,
  stories bigint, umbrellas bigint, replies bigint,
  avg_posts numeric, avg_umbrellas numeric, avg_replies numeric)
language plpgsql security definer set search_path = public as $$
declare u bigint; p bigint; s bigint; um bigint; rp bigint;
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_moderator) then
    raise exception using message = 'not_authorized';
  end if;
  select count(*) into u  from public.profiles where not coalesce(is_bot, false);
  select count(distinct st.author_id) into p from public.stories st
    join public.profiles pr on pr.id = st.author_id where not coalesce(pr.is_bot, false);
  select count(*) into s  from public.stories st
    join public.profiles pr on pr.id = st.author_id where not coalesce(pr.is_bot, false);
  select count(*) into um from public.umbrellas ub
    join public.profiles pr on pr.id = ub.user_id where not coalesce(pr.is_bot, false);
  select count(*) into rp from public.umbrellas ub
    join public.profiles pr on pr.id = ub.user_id
    where not coalesce(pr.is_bot, false) and ub.note is not null and btrim(ub.note) <> '';
  return query select
    u, p, (u - p),
    round(((u - p)::numeric / nullif(u, 0)) * 100, 1),
    s, um, rp,
    round(s::numeric  / nullif(u, 0), 2),
    round(um::numeric / nullif(u, 0), 2),
    round(rp::numeric / nullif(u, 0), 2);
end $$;
grant execute on function engagement_stats() to authenticated;

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
      (now() at time zone 'America/Vancouver')::date::timestamp, interval '1 day') d
  ),
  st as (select (s.created_at at time zone 'America/Vancouver')::date as day, count(*) as c
         from public.stories s join public.profiles pr on pr.id = s.author_id
         where not coalesce(pr.is_bot, false) group by 1),
  um as (select (u.created_at at time zone 'America/Vancouver')::date as day, count(*) as c
         from public.umbrellas u join public.profiles pr on pr.id = u.user_id
         where not coalesce(pr.is_bot, false) group by 1),
  au as (select ua.day as day, count(*) as c
         from public.user_activity ua join public.profiles pr on pr.id = ua.user_id
         where not coalesce(pr.is_bot, false) group by 1),
  rg as (select (pr.created_at at time zone 'America/Vancouver')::date as day, count(*) as c
         from public.profiles pr where not coalesce(pr.is_bot, false) group by 1)
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
