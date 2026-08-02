-- Enable Supabase Realtime for the tables the app subscribes to.
-- Run once in the SQL Editor (this is what the "Replication" toggle did).
-- Safe to re-run — it only adds a table if it isn't already published.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'umbrellas'
  ) then
    alter publication supabase_realtime add table umbrellas;   -- live bell
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'poll_votes'
  ) then
    alter publication supabase_realtime add table poll_votes;  -- live poll results
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'stories'
  ) then
    alter publication supabase_realtime add table stories;     -- live feed refresh
  end if;
end $$;

-- Check what's live:
select tablename from pg_publication_tables
where pubname = 'supabase_realtime' and schemaname = 'public' order by 1;
