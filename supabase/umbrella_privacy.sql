-- ============================================================
--  Umbrella — stop exposing WHO supported whom. Run once in Supabase SQL
--  Editor, AFTER anonymity_fix.sql (needs story_authors). Safe to re-run.
--
--  THE LEAK: umbrellas were world-readable (using true), so anyone could read
--  user_id on every umbrella and de-anonymize supporters — who opened an
--  umbrella / left a "me too" on which story.
--
--  THE FIX: you can read only your OWN umbrellas, plus umbrellas on your OWN
--  stories (for your inbox). Public aggregate counts (community total, a
--  profile's "umbrellas opened") are exposed via SECURITY DEFINER RPCs, so the
--  numbers stay public without exposing the individual rows.
-- ============================================================

drop policy if exists "read umbrellas" on umbrellas;
create policy "read umbrellas" on umbrellas for select using (
  auth.uid() = user_id
  or exists (
    select 1 from story_authors sa
    where sa.story_id = umbrellas.story_id and sa.author_id = auth.uid()
  )
);

-- public aggregates (counts only — never the rows)
create or replace function community_umbrellas() returns bigint
language sql security definer set search_path = public stable as $$
  select count(*) from umbrellas
$$;
grant execute on function community_umbrellas() to anon, authenticated;

create or replace function umbrellas_opened_by(uid uuid) returns bigint
language sql security definer set search_path = public stable as $$
  select count(*) from umbrellas where user_id = uid
$$;
grant execute on function umbrellas_opened_by(uuid) to anon, authenticated;
