-- Notifications support — run once in Supabase SQL Editor. Safe to re-run.
-- Tracks when we last emailed each member, so the daily job never spams them
-- (at most ~once a day) and can re-engage people it hasn't emailed in a while.
alter table profiles add column if not exists last_notified_at timestamptz;
