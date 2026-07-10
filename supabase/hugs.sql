-- ============================================================
--  Umbrella — the Hug. A lighter, UNLIMITED "I'm here with you" (no daily cap,
--  unlike the umbrella). Who hugged is shown openly (faces on the post), so it's
--  a warm, social signal. Run once in Supabase SQL Editor. Safe to re-run.
-- ============================================================

create table if not exists hugs (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (story_id, user_id)          -- one hug per person per post (a toggle), but no daily limit
);
alter table stories add column if not exists hug_count int not null default 0;

alter table hugs enable row level security;
-- Hugs are meant to be SEEN (faces on the post) — this is a deliberate, public,
-- positive signal, unlike the more private umbrella.
drop policy if exists "read hugs" on hugs;
create policy "read hugs" on hugs for select using (true);
drop policy if exists "insert own hug" on hugs;
create policy "insert own hug" on hugs for insert with check (auth.uid() = user_id);
drop policy if exists "delete own hug" on hugs;
create policy "delete own hug" on hugs for delete using (auth.uid() = user_id);

-- keep hug_count in sync
create or replace function sync_hug_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update stories set hug_count = hug_count + 1 where id = new.story_id;
  elsif tg_op = 'DELETE' then
    update stories set hug_count = greatest(0, hug_count - 1) where id = old.story_id;
  end if;
  return null;
end $$;
drop trigger if exists trg_sync_hug on hugs;
create trigger trg_sync_hug after insert or delete on hugs
  for each row execute function sync_hug_count();

-- the faces to show on a post (joins hugs → profiles). Newest first.
create or replace function story_huggers(sid uuid, lim int default 20)
returns table(user_id uuid, username text, avatar_url text, accent_color text)
language sql security definer set search_path = public stable as $$
  select h.user_id, p.username, p.avatar_url, p.accent_color
  from hugs h join profiles p on p.id = h.user_id
  where h.story_id = sid
  order by h.created_at desc
  limit greatest(1, lim)
$$;
grant execute on function story_huggers(uuid, int) to anon, authenticated;
