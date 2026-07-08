-- ============================================================
--  Umbrella — per-day activity for the moderator graph.
--  Run once in Supabase SQL Editor, AFTER site_metrics.sql + views_repeat.sql.
--  Safe to re-run.
--
--  Stories and umbrellas already have created_at, so their per-day history is
--  computed on the fly. Views only ever kept a running total, so we start
--  recording a per-day row here — the views line fills in from today forward.
--  The graph uses the HONEST view count (views_real, once per session), so the
--  trend is meaningful rather than the inflated vanity number.
-- ============================================================

-- per-day view tallies (private, like views_real)
create table if not exists daily_views (
  day date primary key,
  views bigint not null default 0,        -- inflated: every load
  views_real bigint not null default 0    -- honest: once per session
);
alter table daily_views enable row level security;   -- no policy → not client-readable; the RPC (definer) reads it

-- bump_view now also records today's row (America/Vancouver day, matching the app)
create or replace function bump_view(fresh boolean default true) returns void
language plpgsql security definer set search_path = public as $$
declare today date := (now() at time zone 'America/Vancouver')::date;
begin
  update site_metrics set value = value + 1 where key = 'views';
  if fresh then
    update site_metrics set value = value + 1 where key = 'views_real';
  end if;
  insert into daily_views (day, views, views_real)
    values (today, 1, case when fresh then 1 else 0 end)
  on conflict (day) do update
    set views = daily_views.views + 1,
        views_real = daily_views.views_real + (case when fresh then 1 else 0 end);
end $$;

-- Moderator-only per-day series for the last `days` days, gaps filled with 0.
create or replace function activity_by_day(days int default 30)
returns table(day date, views bigint, stories bigint, umbrellas bigint)
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
  st as (
    select (created_at at time zone 'America/Vancouver')::date as day, count(*) c
    from stories group by 1
  ),
  um as (
    select (created_at at time zone 'America/Vancouver')::date as day, count(*) c
    from umbrellas group by 1
  )
  select sp.day,
         coalesce(dv.views_real, 0)::bigint,
         coalesce(st.c, 0)::bigint,
         coalesce(um.c, 0)::bigint
  from span sp
  left join daily_views dv on dv.day = sp.day
  left join st on st.day = sp.day
  left join um on um.day = sp.day
  order by sp.day;
end $$;

grant execute on function activity_by_day(int) to anon, authenticated;
