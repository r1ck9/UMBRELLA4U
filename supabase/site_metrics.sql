-- Site metrics — run once in Supabase SQL Editor. Safe to re-run.
-- A tiny counter table for things like total page views. Registrations,
-- stories, and umbrellas are counted directly from their own tables.
create table if not exists site_metrics (
  key text primary key,
  value bigint not null default 0
);
insert into site_metrics (key, value) values ('views', 0) on conflict (key) do nothing;

alter table site_metrics enable row level security;

drop policy if exists "read metrics" on site_metrics;
create policy "read metrics" on site_metrics for select using (true);

-- Increment the view counter (called from the site; can't be set to arbitrary values).
create or replace function bump_view() returns void
language plpgsql security definer set search_path = public as $$
begin
  update site_metrics set value = value + 1 where key = 'views';
end $$;
