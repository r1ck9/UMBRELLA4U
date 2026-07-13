-- Make the Rail's "umbrellas opened" total match the posts + community banner.
-- community_umbrellas() counted raw umbrellas-table rows; sum the per-story
-- umbrella_count instead (same basis as community_pulse). Run in SQL Editor.
create or replace function community_umbrellas() returns bigint
language sql security definer set search_path = public stable as $$
  select coalesce(sum(umbrella_count), 0)::bigint from stories where state = 'live'
$$;
grant execute on function community_umbrellas() to anon, authenticated;
