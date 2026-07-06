-- Umbrella database schema (Supabase / Postgres)
-- Run this once in your Supabase project: SQL Editor → paste → Run.
-- Maps to Umbrella-PRD.md §9.

-- ---------- PROFILES (one row per signed-up user) ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  pronouns text,
  status_weather text,
  about_me text,
  accent_color text default '#e8913c',
  avatar_url text,
  banner_url text,
  created_at timestamptz default now()
);

-- ---------- STORIES ----------
create table if not exists stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users(id) on delete set null,
  author_name text,                       -- username copy; NULL when anonymous
  anonymous boolean default false,
  text text not null,
  intent text not null default 'listen'
    check (intent in ('listen','advice','similar','resources')),
  category text not null,
  content_warning boolean default false,
  umbrella_count int default 0,
  state text default 'live' check (state in ('live','hidden','removed')),
  created_at timestamptz default now()
);

-- ---------- UMBRELLAS (one per person, per story) ----------
create table if not exists umbrellas (
  id uuid primary key default gen_random_uuid(),
  story_id uuid references stories(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  note text,
  created_at timestamptz default now(),
  unique (story_id, user_id)              -- enforces "one umbrella each"
);

-- ---------- REPORTS ----------
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('story','umbrella','profile')),
  target_id uuid not null,
  reporter_id uuid references auth.users(id) on delete set null,
  reason text,
  status text default 'open' check (status in ('open','actioned','dismissed')),
  created_at timestamptz default now()
);

-- ---------- keep umbrella_count in sync ----------
create or replace function bump_umbrella_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update stories set umbrella_count = umbrella_count + 1 where id = new.story_id;
  return new;
end $$;
drop trigger if exists trg_bump_umbrella on umbrellas;
create trigger trg_bump_umbrella after insert on umbrellas
  for each row execute function bump_umbrella_count();

-- ---------- set story author from the logged-in user ----------
create or replace function set_story_author() returns trigger language plpgsql as $$
begin
  new.author_id := auth.uid();
  if new.anonymous then
    new.author_name := null;              -- fully anonymous: no username on the visible row
  else
    new.author_name := (select username from profiles where id = auth.uid());
  end if;
  return new;
end $$;
drop trigger if exists trg_story_author on stories;
create trigger trg_story_author before insert on stories
  for each row execute function set_story_author();

-- ---------- create a profile row automatically on signup ----------
create or replace function handle_new_user() returns trigger language plpgsql
security definer set search_path = public as $$
begin
  insert into profiles (id, username)
  values (new.id, 'user_' || substr(new.id::text, 1, 8));
  return new;
end $$;
drop trigger if exists trg_new_user on auth.users;
create trigger trg_new_user after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- ROW LEVEL SECURITY ----------
alter table profiles  enable row level security;
alter table stories   enable row level security;
alter table umbrellas enable row level security;
alter table reports   enable row level security;

-- Anyone (including logged-out guests) can READ:
create policy "read live stories" on stories   for select using (state = 'live');
create policy "read profiles"     on profiles  for select using (true);
create policy "read umbrellas"    on umbrellas for select using (true);

-- Only logged-in users can WRITE:
create policy "insert own story"  on stories   for insert with check (auth.uid() is not null);
create policy "insert umbrella"   on umbrellas for insert with check (auth.uid() = user_id);
create policy "insert report"     on reports   for insert with check (auth.uid() is not null);
create policy "manage own profile" on profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);
