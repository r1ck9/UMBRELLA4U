-- Feed ranking support — run once in Supabase SQL Editor. Safe to re-run.
-- Adds a per-story view counter so the feed algorithm can factor in views.
alter table stories add column if not exists view_count int not null default 0;

create or replace function bump_story_view(sid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update stories set view_count = view_count + 1 where id = sid;
end $$;
