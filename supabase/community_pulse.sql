-- ============================================================
--  Umbrella — public "community pulse" totals for the live banner.
--  Run once in Supabase SQL Editor, AFTER day_boundary_tz.sql (uses
--  app_day_start). Safe to re-run. Returns aggregate COUNTS only — never rows,
--  so it's safe to show everyone (including guests).
--
--  The community "umbrellas" total is the SUM of each live story's
--  umbrella_count, so it always matches the numbers shown on the posts
--  themselves (rather than counting raw umbrellas-table rows, which diverges
--  when counts are set directly on stories).
-- ============================================================

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
