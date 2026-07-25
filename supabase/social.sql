-- ============================================================
--  Umbrella — Follows + Channels. Run once in Supabase SQL Editor. Safe to re-run.
--  Follows: who follows whom (graph kept private; all access via RPCs).
--  Channels: a member's named collections of their own (non-anonymous) posts.
-- ============================================================

-- ---------- FOLLOWS ----------
create table if not exists follows (
  follower_id  uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz default now(),
  primary key (follower_id, following_id)
);
create index if not exists follows_following on follows(following_id);
alter table follows enable row level security;   -- no direct policies: access only through the RPCs below

create or replace function follow(target uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception using message = 'not_authenticated'; end if;
  if target = auth.uid() then return; end if;
  insert into follows(follower_id, following_id) values (auth.uid(), target) on conflict do nothing;
end $$;
grant execute on function follow(uuid) to authenticated;

create or replace function unfollow(target uuid) returns void
language sql security definer set search_path = public as $$
  delete from follows where follower_id = auth.uid() and following_id = target;
$$;
grant execute on function unfollow(uuid) to authenticated;

create or replace function is_following(target uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from follows where follower_id = auth.uid() and following_id = target);
$$;
grant execute on function is_following(uuid) to authenticated;

create or replace function follow_counts(target uuid) returns table(followers bigint, following bigint)
language sql security definer set search_path = public stable as $$
  select (select count(*) from follows where following_id = target),
         (select count(*) from follows where follower_id  = target);
$$;
grant execute on function follow_counts(uuid) to anon, authenticated;

-- ---------- CHANNELS ----------
create table if not exists channels (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  name       text not null check (length(btrim(name)) between 1 and 40),
  created_at timestamptz default now()
);
create index if not exists channels_owner on channels(owner_id);
alter table channels enable row level security;
drop policy if exists "channels read"       on channels;
create policy "channels read"       on channels for select using (true);
drop policy if exists "channels insert own" on channels;
create policy "channels insert own" on channels for insert with check (auth.uid() = owner_id);
drop policy if exists "channels delete own" on channels;
create policy "channels delete own" on channels for delete using (auth.uid() = owner_id);

-- A post can live in one of its author's channels (null = not filed).
alter table stories add column if not exists channel_id uuid references channels(id) on delete set null;
