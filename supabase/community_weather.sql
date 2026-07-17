-- ============================================================
--  Community BANNER = inflated social proof (bots INCLUDED). This is what
--  visitors see, so it should look alive. The MODERATION data is the honest one
--  (engagement_stats + activity_by_day in bot_engine.sql exclude bots) — don't
--  change those. Run in the SQL Editor. Safe to re-run.
-- ============================================================

-- Banner umbrella total: sum of every live post's umbrella_count (bots included).
create or replace function community_umbrellas() returns bigint
language sql security definer set search_path = public stable as $$
  select coalesce(sum(umbrella_count), 0)::bigint from stories where state = 'live'
$$;
grant execute on function community_umbrellas() to anon, authenticated;

-- Banner pulse — all counts include bots (social proof).
create or replace function community_pulse()
returns table(umbrellas bigint, stories bigint, members bigint, umbrellas_today bigint)
language sql security definer set search_path = public stable as $$
  select
    (select coalesce(sum(umbrella_count), 0)::bigint from stories where state = 'live'),
    (select count(*) from stories where state = 'live'),
    (select count(*) from profiles),
    (select count(*) from umbrellas where created_at >= app_day_start())
$$;
grant execute on function community_pulse() to anon, authenticated;

-- "Skies cleared" — every live post (bots included) that reached sunny.
create or replace function sunny_count() returns bigint
language sql security definer set search_path = public stable as $$
  select count(*)::bigint from stories
  where state = 'live' and umbrella_count >=
    case coalesce(weather, -1)
      when 0 then 50 when 1 then 35 when 2 then 22 when 3 then 12 when 4 then 8 else 50 end
$$;
grant execute on function sunny_count() to anon, authenticated;
