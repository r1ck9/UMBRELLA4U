-- ============================================================
--  Umbrella — polls / voting on stories. Run once in Supabase SQL Editor.
--  Run AFTER: schema.sql, word_filter_v2.sql, profile_filter.sql, pii_filter.sql
--  (this reuses contains_blocked() and contains_personal_info() from those).
--  Safe to re-run.
--
--  A story can carry an optional poll of 2–4 options. Anyone can READ the
--  options + vote tallies (results are public + live). Signed-in members vote
--  ONCE per poll — the same "one umbrella each" spirit, enforced by a unique
--  constraint. Option text is screened by the SAME word/PII filters as stories
--  and umbrella notes, so nothing slips through a poll that couldn't be posted.
-- ============================================================

-- ---------- POLL OPTIONS (2–4 per story that has a poll) ----------
create table if not exists poll_options (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  idx int not null,                          -- display order, 0..n
  label text not null,
  vote_count int not null default 0,         -- denormalized live tally
  created_at timestamptz default now()
);
create index if not exists poll_options_story on poll_options(story_id);

-- ---------- POLL VOTES (one per person, per poll) ----------
create table if not exists poll_votes (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  option_id uuid not null references poll_options(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (story_id, user_id)                 -- can't vote twice on the same poll
);

-- ---------- keep the live tally in sync ----------
create or replace function bump_poll_vote() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update poll_options set vote_count = vote_count + 1 where id = new.option_id;
  return new;
end $$;
drop trigger if exists trg_bump_poll_vote on poll_votes;
create trigger trg_bump_poll_vote after insert on poll_votes
  for each row execute function bump_poll_vote();

-- ---------- screen option text (same filters as stories + notes) ----------
create or replace function screen_poll_option() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.label is null or btrim(new.label) = '' then
    raise exception using message = 'empty_option';
  end if;
  if contains_blocked(new.label) then
    raise exception using message = 'blocked_content';
  end if;
  if contains_personal_info(new.label) then
    raise exception using message = 'personal_info';
  end if;
  return new;
end $$;
drop trigger if exists trg_screen_poll_option on poll_options;
create trigger trg_screen_poll_option before insert or update on poll_options
  for each row execute function screen_poll_option();

-- ---------- ROW LEVEL SECURITY ----------
alter table poll_options enable row level security;
alter table poll_votes   enable row level security;

-- Anyone (including logged-out guests) can READ options + tallies — results are public.
create policy "read poll options" on poll_options for select using (true);
create policy "read poll votes"    on poll_votes  for select using (true);

-- Only the story's own author may attach options, and only to their own story.
create policy "author inserts options" on poll_options for insert
  with check (exists (
    select 1 from stories s
    where s.id = poll_options.story_id and s.author_id = auth.uid()
  ));

-- Any signed-in member can cast their own vote (the unique constraint keeps it to one).
create policy "member votes" on poll_votes for insert
  with check (auth.uid() = user_id);
