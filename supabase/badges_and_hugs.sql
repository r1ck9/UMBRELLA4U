-- ============================================================
--  Umbrella — badge counters + "an umbrella is a hug".
--  Run once in Supabase SQL Editor. Safe to re-run.
--
--  Adds two denormalized counters on profiles so badges render cheaply
--  everywhere (feed cards + profiles): post_count and umbrellas_sent.
--  Streak already lives on profiles (streak.sql).
-- ============================================================

alter table profiles add column if not exists post_count      int not null default 0;
alter table profiles add column if not exists umbrellas_sent  int not null default 0;

-- ---------- post_count: every story a member shares ----------
-- Counts ALL their stories (including anonymous ones — author_id is still set
-- on anonymous posts; only the visible name is hidden). The badge rewards
-- showing up and sharing, regardless of whether the post carried their name.
create or replace function sync_post_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.author_id is not null then
    update profiles set post_count = post_count + 1 where id = new.author_id;
  elsif tg_op = 'DELETE' and old.author_id is not null then
    update profiles set post_count = greatest(0, post_count - 1) where id = old.author_id;
  end if;
  return null;
end $$;
drop trigger if exists trg_sync_post_count on stories;
create trigger trg_sync_post_count after insert or delete on stories
  for each row execute function sync_post_count();

-- ---------- umbrellas_sent: every umbrella a member opens (= a hug) ----------
create or replace function sync_umbrellas_sent() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update profiles set umbrellas_sent = umbrellas_sent + 1 where id = new.user_id;
  elsif tg_op = 'DELETE' then
    update profiles set umbrellas_sent = greatest(0, umbrellas_sent - 1) where id = old.user_id;
  end if;
  return null;
end $$;
drop trigger if exists trg_sync_umbrellas_sent on umbrellas;
create trigger trg_sync_umbrellas_sent after insert or delete on umbrellas
  for each row execute function sync_umbrellas_sent();

-- ---------- one-time backfill from existing rows ----------
update profiles p set
  post_count     = coalesce((select count(*) from stories   s where s.author_id = p.id), 0),
  umbrellas_sent = coalesce((select count(*) from umbrellas u where u.user_id  = p.id), 0);

-- ============================================================
--  An umbrella IS a hug — align the hug count with the umbrella count.
--  Opening an umbrella already sends a hug going forward; this reconciles
--  any existing rows so every story's hug count matches its umbrellas.
--  (Not fake data: each umbrella genuinely represents a hug.)
-- ============================================================
update stories set hug_count = umbrella_count where hug_count is distinct from umbrella_count;
