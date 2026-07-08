-- ============================================================
--  Umbrella — notification support v2. Run once in Supabase SQL Editor.
--  Safe to re-run.
--    • last_reengaged_at — so a "welcome back" email goes at most once a month
--    • app_settings      — tiny text key/value store; used to remember which
--      weekly prompt we've already announced (site_metrics only holds numbers)
-- ============================================================

alter table profiles add column if not exists last_reengaged_at timestamptz;

create table if not exists app_settings (
  key text primary key,
  value text
);
alter table app_settings enable row level security;   -- server-only; the cron uses the service role
