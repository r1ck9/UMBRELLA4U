-- Fix: make the umbrella counter update correctly. Run once in Supabase SQL Editor.
-- The counter trigger needs elevated rights (security definer) to update the
-- stories table, which row-level security otherwise silently blocks.
-- Also recounts existing umbrellas so current totals are correct.

create or replace function bump_umbrella_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update stories set umbrella_count = umbrella_count + 1 where id = new.story_id;
  return new;
end $$;

-- reconcile any umbrellas that weren't counted yet
update stories s
set umbrella_count = (select count(*) from umbrellas u where u.story_id = s.id);
