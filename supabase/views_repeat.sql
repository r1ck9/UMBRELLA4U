-- ============================================================
--  Umbrella — page views: inflate the shown number, keep an honest one private.
--  Run once in Supabase SQL Editor, AFTER site_metrics.sql. Safe to re-run.
--  SUPERSEDES view_breakdown.sql (drops the guest/member split).
--
--    • 'views'      — the SHOWN number. Bumped on every page load and every
--                     navigation/reopen, so it grows fast (a vanity counter).
--    • 'views_real' — the PRIVATE, honest number. Bumped once per browser
--                     session only. Hidden by RLS so it isn't publicly
--                     readable; read it with the service role when you want it.
-- ============================================================

-- drop the guest/member experiment
delete from site_metrics where key = 'views_member';

-- the private honest counter
insert into site_metrics (key, value) values ('views_real', 0) on conflict (key) do nothing;

-- bump_view(fresh): fresh = true means this is the first view of the session
drop function if exists bump_view();
create or replace function bump_view(fresh boolean default true) returns void
language plpgsql security definer set search_path = public as $$
begin
  update site_metrics set value = value + 1 where key = 'views';           -- shown: every view
  if fresh then
    update site_metrics set value = value + 1 where key = 'views_real';    -- private: once per session
  end if;
end $$;

-- Read policy: everything is public EXCEPT the private real count.
drop policy if exists "read metrics" on site_metrics;
create policy "read metrics" on site_metrics for select using (key <> 'views_real');
