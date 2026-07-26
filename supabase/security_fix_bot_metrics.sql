-- ============================================================
--  SECURITY FIX — bot_metrics view exposed to the API (Supabase lint:
--  "Security Definer View"). Run once in the SQL Editor. Safe to re-run.
--
--  bot_metrics lists EVERY bot account (where is_bot) with usernames + stats,
--  and had `grant select ... to authenticated`, so any logged-in user could
--  read the full bot roster through the REST API — which would expose exactly
--  which accounts/posts are seeded. The app never queries this view (it's only
--  for manual checks in the SQL editor), so we cut off API access entirely.
-- ============================================================

-- 1) Recreate the view so it respects the caller's RLS instead of running as
--    definer (Postgres 15+, which Supabase uses). Belt-and-suspenders with #2.
create or replace view bot_metrics with (security_invoker = on) as
select
  p.id, p.username, p.display_name, p.bot_kind,
  p.bot_posts_per_day, p.bot_umbrellas_per_day,
  p.created_at as joined_at,
  coalesce((select count(*) from stories s where s.author_id = p.id and s.state='live'), 0) as posts,
  coalesce((select count(*) from umbrellas u where u.user_id = p.id), 0)              as umbrellas_given,
  coalesce((select sum(s.umbrella_count) from stories s where s.author_id = p.id), 0) as umbrellas_received
from profiles p
where p.is_bot
order by p.bot_kind, p.username;

-- 2) The real fix: no browser role may read it. Only the table owner (you, in
--    the SQL editor) and the service_role can. This overrides the old grant.
revoke all on bot_metrics from anon, authenticated;
