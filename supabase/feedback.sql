-- Feedback inbox — run once in Supabase SQL Editor. Safe to re-run.
-- Anyone (including logged-out visitors) can send feedback; only moderators can read it.
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  message text not null,
  created_at timestamptz default now()
);
alter table feedback enable row level security;

drop policy if exists "anyone can send feedback" on feedback;
create policy "anyone can send feedback" on feedback for insert with check (true);

drop policy if exists "mods read feedback" on feedback;
create policy "mods read feedback" on feedback for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_moderator));
