-- ============================================================
--  Umbrella — moderator "boost" (upvote). Run once in Supabase SQL Editor.
--  Safe to re-run. Moderators can boost a story so it ranks higher and more
--  people see it. Regular members have no vote — this is a curation tool.
-- ============================================================

-- denormalized tally so the feed ranking (lib/stories.js) can read it cheaply
alter table stories add column if not exists boost_count int not null default 0;

-- one row per (moderator, story) — a toggle, so a mod can't inflate it
create table if not exists story_boosts (
  story_id uuid not null references stories(id) on delete cascade,
  mod_id   uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (story_id, mod_id)
);
alter table story_boosts enable row level security;

-- a mod may see their OWN boosts (to show the button's on/off state)
drop policy if exists "read own boosts" on story_boosts;
create policy "read own boosts" on story_boosts for select using (auth.uid() = mod_id);
-- writes happen only through toggle_boost() (security definer), so no write policy

-- keep stories.boost_count in sync
create or replace function sync_boost_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update stories set boost_count = boost_count + 1 where id = new.story_id;
  elsif tg_op = 'DELETE' then
    update stories set boost_count = greatest(0, boost_count - 1) where id = old.story_id;
  end if;
  return null;
end $$;
drop trigger if exists trg_sync_boost on story_boosts;
create trigger trg_sync_boost after insert or delete on story_boosts
  for each row execute function sync_boost_count();

-- toggle this moderator's boost on a story; returns the new boost_count
create or replace function toggle_boost(sid uuid) returns int
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if not exists (select 1 from profiles where id = uid and is_moderator) then
    raise exception using message = 'not_authorized';
  end if;
  if exists (select 1 from story_boosts where story_id = sid and mod_id = uid) then
    delete from story_boosts where story_id = sid and mod_id = uid;
  else
    insert into story_boosts (story_id, mod_id) values (sid, uid);
  end if;
  return (select boost_count from stories where id = sid);
end $$;

grant execute on function toggle_boost(uuid) to authenticated;
