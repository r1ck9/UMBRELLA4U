-- ============================================================
--  Umbrella — split page views into members vs guests.
--  Run once in Supabase SQL Editor, AFTER site_metrics.sql. Safe to re-run.
--
--  bump_view() runs with the caller's auth context, so auth.uid() tells us
--  whether a signed-in member or a logged-out guest is viewing — without the
--  browser sending anything. We keep 'views' as the grand total (unchanged,
--  backward-compatible) and add 'views_member' for signed-in views.
--  Guest views = views - views_member.
-- ============================================================

insert into site_metrics (key, value) values ('views_member', 0) on conflict (key) do nothing;

create or replace function bump_view() returns void
language plpgsql security definer set search_path = public as $$
begin
  update site_metrics set value = value + 1 where key = 'views';           -- total: guests + members
  if auth.uid() is not null then
    update site_metrics set value = value + 1 where key = 'views_member';  -- signed-in members only
  end if;
end $$;
