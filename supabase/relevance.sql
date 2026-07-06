-- ============================================================
--  Umbrella — community "not relevant here" signal.
--  Run once in Supabase SQL Editor. Safe to re-run.
--
--  What it does: any signed-in member can quietly mark a post as
--  off-topic (spam / joke / doesn't belong). No score is ever shown
--  to the poster. Once OFF_TOPIC_THRESHOLD (3) DIFFERENT members mark
--  a post, the app sinks it to the bottom of the feed and surfaces it
--  in the moderator queue. It NEVER auto-deletes — a human decides.
-- ============================================================

-- ---------- 1) MARKS TABLE (one mark per member, per story) ----------
create table if not exists relevance_marks (
  id uuid primary key default gen_random_uuid(),
  story_id uuid references stories(id) on delete cascade,
  user_id  uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (story_id, user_id)              -- one member can only mark once
);

-- ---------- 2) COUNT ON THE STORY ----------
alter table stories add column if not exists off_topic_count int default 0;

-- ---------- 3) KEEP THE COUNT IN SYNC ----------
create or replace function bump_off_topic_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update stories set off_topic_count = off_topic_count + 1 where id = new.story_id;
  return new;
end $$;
drop trigger if exists trg_bump_off_topic on relevance_marks;
create trigger trg_bump_off_topic after insert on relevance_marks
  for each row execute function bump_off_topic_count();

-- ---------- 4) ROW LEVEL SECURITY ----------
alter table relevance_marks enable row level security;

-- Anyone can read marks (needed to know if you've already marked something).
drop policy if exists "read relevance marks" on relevance_marks;
create policy "read relevance marks" on relevance_marks for select using (true);

-- A member can only add their OWN mark.
drop policy if exists "insert own relevance mark" on relevance_marks;
create policy "insert own relevance mark" on relevance_marks for insert
  with check (auth.uid() = user_id);

-- ---------- 5) MODERATOR "KEEP IT" (dismiss the marks) ----------
-- Clears the off-topic marks on a post so it returns to normal ranking.
-- Only a moderator can call it. (Take-down uses the existing delete policy.)
create or replace function dismiss_relevance(sid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles p where p.id = auth.uid() and p.is_moderator) then
    raise exception 'not a moderator';
  end if;
  delete from relevance_marks where story_id = sid;
  update stories set off_topic_count = 0 where id = sid;
end $$;
