-- ============================================================
--  Community stats: keep bots out of the member/registration count, and add a
--  "skies cleared" (sunny) counter for the banner. Run in the SQL Editor.
--  Safe to re-run.
--
--  Note: site VIEWS come only from real browser sessions (bump_story_view), and
--  the funnel tracks real visitors — bots never touch either. engagement_stats
--  and activity_by_day already exclude bots (see bot_engine.sql).
-- ============================================================

create or replace function community_pulse()
returns table(umbrellas bigint, stories bigint, members bigint, umbrellas_today bigint)
language sql security definer set search_path = public stable as $$
  select
    (select coalesce(sum(umbrella_count), 0)::bigint from stories where state = 'live'),
    (select count(*) from stories where state = 'live'),
    (select count(*) from profiles where not coalesce(is_bot, false)),   -- members exclude bots
    (select count(*) from umbrellas where created_at >= app_day_start())
$$;
grant execute on function community_pulse() to anon, authenticated;

-- How many live posts have reached "sunny" (umbrellas >= the post's weather target).
create or replace function sunny_count() returns bigint
language sql security definer set search_path = public stable as $$
  select count(*)::bigint from stories
  where state = 'live' and umbrella_count >=
    case coalesce(weather, -1)
      when 0 then 50 when 1 then 35 when 2 then 22 when 3 then 12 when 4 then 8 else 50 end
$$;
grant execute on function sunny_count() to anon, authenticated;
