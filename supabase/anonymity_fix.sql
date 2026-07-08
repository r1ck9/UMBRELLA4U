-- ============================================================
--  Umbrella — FIX THE ANONYMITY LEAK. Run once in Supabase SQL Editor.
--  Run AFTER schema.sql, day_boundary_tz.sql, and metrics_v2.sql. Safe to re-run.
--
--  THE BUG: an "anonymous" story hid the username but still stored a
--  publicly-readable author_id, so anyone could link anonymous posts to their
--  author (and to a username via profiles). This broke the core promise.
--
--  THE FIX (sealed-but-retained, per PRD §16 Q6):
--    • public stories.author_id  → NULL for anonymous posts (kept for named)
--    • real author               → PRIVATE story_authors table; you can read
--                                   only YOUR OWN rows, never anyone else's
--    • limits / "my stories" / notifications / delete rights all route through
--      the private table so nothing breaks.
-- ============================================================

-- ---------- private author link ----------
create table if not exists story_authors (
  story_id uuid primary key references stories(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null
);
alter table story_authors enable row level security;

-- You may read ONLY your own author links (lets you find/delete your own posts,
-- including anonymous ones). No one can look up who wrote someone else's post.
drop policy if exists "read own author link" on story_authors;
create policy "read own author link" on story_authors for select
  using (auth.uid() = author_id);
-- writes happen only via the security-definer trigger below (no insert policy)

-- backfill: existing rows currently still carry author_id (incl. old anon posts)
insert into story_authors (story_id, author_id)
  select id, author_id from stories where author_id is not null
  on conflict (story_id) do nothing;

-- close the existing leak on old data
update stories set author_id = null where anonymous = true;

-- ---------- triggers ----------
-- BEFORE: public author is NULL for anonymous posts, set for named posts
create or replace function set_story_author() returns trigger language plpgsql as $$
begin
  if new.anonymous then
    new.author_id := null;
    new.author_name := null;
  else
    new.author_id := auth.uid();
    new.author_name := (select username from profiles where id = auth.uid());
  end if;
  return new;
end $$;
drop trigger if exists trg_story_author on stories;
create trigger trg_story_author before insert on stories
  for each row execute function set_story_author();

-- AFTER: record the real author privately (both anonymous and named)
create or replace function record_story_author() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into story_authors (story_id, author_id) values (new.id, auth.uid())
  on conflict (story_id) do nothing;
  return null;
end $$;
drop trigger if exists trg_record_author on stories;
create trigger trg_record_author after insert on stories
  for each row execute function record_story_author();

-- ---------- delete rights (author of own post, incl. anonymous) ----------
drop policy if exists "authors delete own story" on stories;
create policy "authors delete own story" on stories for delete
  using (exists (select 1 from story_authors sa where sa.story_id = stories.id and sa.author_id = auth.uid()));
-- (the "moderators delete any story" policy from moderation_all.sql still applies)

-- ---------- daily post limit via the private link ----------
create or replace function enforce_daily_story_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare cnt int;
begin
  select count(*) into cnt
  from stories s join story_authors sa on sa.story_id = s.id
  where sa.author_id = auth.uid() and s.created_at >= app_day_start();
  if cnt >= 5 then
    raise exception using message = 'daily_story_limit';
  end if;
  return new;
end $$;
drop trigger if exists trg_daily_story_limit on stories;
create trigger trg_daily_story_limit before insert on stories
  for each row execute function enforce_daily_story_limit();

-- ---------- engagement_stats: count posters via the private link ----------
-- (anonymous authors are real posters too; keep the metrics_v2 column shape)
drop function if exists engagement_stats();
create or replace function engagement_stats()
returns table(
  users bigint, posters bigint, never_posted bigint, never_pct numeric,
  stories bigint, umbrellas bigint, replies bigint,
  avg_posts numeric, avg_umbrellas numeric, avg_replies numeric
)
language plpgsql security definer set search_path = public as $$
declare u bigint; p bigint; s bigint; um bigint; rp bigint;
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_moderator) then
    raise exception using message = 'not_authorized';
  end if;
  select count(*) into u  from public.profiles;
  select count(distinct author_id) into p from public.story_authors where author_id is not null;
  select count(*) into s  from public.stories;
  select count(*) into um from public.umbrellas;
  select count(*) into rp from public.umbrellas where note is not null and btrim(note) <> '';
  return query select
    u, p, (u - p),
    round(((u - p)::numeric / nullif(u, 0)) * 100, 1),
    s, um, rp,
    round(s::numeric  / nullif(u, 0), 2),
    round(um::numeric / nullif(u, 0), 2),
    round(rp::numeric / nullif(u, 0), 2);
end $$;
grant execute on function engagement_stats() to authenticated;
