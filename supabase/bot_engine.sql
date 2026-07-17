-- ============================================================
--  Umbrella — BOT ENGINE (ongoing). Run once in Supabase SQL Editor. Safe to
--  re-run. Complements seed_bots.sql. Private project only.
--
--  Does four things:
--   1. When a REAL person posts a story, it gets an umbrella_target of ~50. A
--      pg_cron job DRIPS bot umbrellas onto it on a 24-hour schedule, so the
--      count climbs to ~50 gradually across the first day, not all at once.
--   2. Every new real post is queued for the owner to reply to (owner_reply_queue)
--      and surfaced in the Moderation page (pending_reply_posts()). Replying via
--      reply_as_bot() posts your words as a member, so it lands in the poster's
--      inbox as "someone left you a word."
--   3. Bots are REMOVED from the owner-facing analytics (engagement_stats,
--      activity_by_day) — those now count REAL users only. The public community
--      banner (community_pulse / community_umbrellas) is left as-is, so the
--      per-post umbrella counts still act as social proof.
--   4. Backfills targets for existing real posts so they start getting umbrellas.
-- ============================================================

-- ---------- schema ----------
alter table stories add column if not exists umbrella_target int;   -- NULL = don't drip (bots/seed)

create table if not exists owner_reply_queue (
  story_id   uuid primary key references stories(id) on delete cascade,
  created_at timestamptz default now(),
  replied    boolean default false,
  replied_at timestamptz
);
alter table owner_reply_queue enable row level security;   -- reached only via the definer functions below

-- Safety: make sure triggers are ON. If a seed run errored between its
-- disable/enable, on_new_story would never fire and new posts would get no
-- umbrellas at all. Re-enabling here is harmless if they're already on.
do $$ begin
  execute 'alter table stories   enable trigger user';
  execute 'alter table umbrellas enable trigger user';
exception when others then null; end $$;

-- ============================================================
--  1) New real post → set an umbrella target + queue it for a reply.
--     Fires only for real (non-bot) authors. During seed_bots.sql the triggers
--     on stories are disabled, so seeded bot posts never get a target/queue row.
-- ============================================================
create or replace function on_new_story() returns trigger
language plpgsql security definer set search_path = public as $$
declare bot_author boolean;
begin
  if new.author_id is null then return null; end if;
  select coalesce(is_bot, false) into bot_author from profiles where id = new.author_id;
  if bot_author then return null; end if;

  update stories set umbrella_target = 45 + floor(random() * 11)::int   -- ~50 (45–55) over 24h
   where id = new.id and umbrella_target is null;

  -- HEAD START: drop a few umbrellas on right away so a brand-new post never
  -- sits at zero. The drip then ramps it toward ~50 over the next 24h.
  insert into umbrellas (story_id, user_id, created_at)
  select new.id, p.id, now() - (random() * interval '2 minutes')
  from profiles p
  where p.is_bot and p.id <> new.author_id
  order by random()
  limit (3 + floor(random() * 4)::int)          -- 3–6 immediately
  on conflict (story_id, user_id) do nothing;

  insert into owner_reply_queue (story_id) values (new.id) on conflict do nothing;
  return null;
end $$;
drop trigger if exists trg_on_new_story on stories;
create trigger trg_on_new_story after insert on stories
  for each row execute function on_new_story();

-- ============================================================
--  2) The drip, paced over a 24-HOUR schedule. For each post: due = target ×
--     (age / 24h). So a post climbs to ~50 umbrellas gradually across its first
--     day, then stops. Runs every few minutes via pg_cron (below); each run just
--     tops a post up to where the schedule says it should be (max a few per run,
--     so nothing lands in a burst). "have" = bot umbrellas so far.
-- ============================================================
create or replace function drip_umbrellas() returns void
language plpgsql security definer set search_path = public as $$
begin
  with prog as (
    select s.id as story_id, s.author_id,
           (select count(*) from umbrellas u join profiles p on p.id = u.user_id
            where u.story_id = s.id and p.is_bot) as have,
           floor(s.umbrella_target
                 * least(1.0, extract(epoch from (now() - s.created_at)) / 86400.0)
                 + (random() - 0.5) * 1.2)::int as due   -- ±0.6 jitter → irregular spacing
    from stories s
    where s.state = 'live' and s.umbrella_target is not null
  ),
  picks as (
    select story_id, author_id, least(due - have, 6)::int as add_n   -- catch up to schedule, max 6/run
    from prog
    where due > have
    order by random()
    limit 400                                                        -- cap posts touched per run
  )
  insert into umbrellas (story_id, user_id, created_at)
  select pk.story_id, b.id, now() - (random() * interval '4 minutes')
  from picks pk
  cross join lateral (
    select p.id from profiles p
    where p.is_bot and p.id <> pk.author_id
      and not exists (select 1 from umbrellas u where u.story_id = pk.story_id and u.user_id = p.id)
    order by random()
    limit pk.add_n
  ) b
  on conflict (story_id, user_id) do nothing;

  -- keep the "an umbrella is a hug" invariant on posts we're dripping
  update stories set hug_count = umbrella_count
   where umbrella_target is not null and hug_count is distinct from umbrella_count;
end $$;
grant execute on function drip_umbrellas() to authenticated;

-- schedule it every 5 minutes via pg_cron (enable the extension first if needed)
do $$ begin perform cron.unschedule('umbrella-drip'); exception when others then null; end $$;
do $$
begin
  perform cron.schedule('umbrella-drip', '*/5 * * * *', $c$ select public.drip_umbrellas(); $c$);
  raise notice 'OK: umbrella-drip scheduled every 5 minutes.';
exception when others then
  raise notice 'pg_cron not enabled. Enable it (Dashboard > Database > Extensions > pg_cron), then run: select cron.schedule(''umbrella-drip'',''*/5 * * * *'',''select public.drip_umbrellas();'');';
end $$;

-- ============================================================
--  3) Owner reply queue — moderator-only helpers.
-- ============================================================
create or replace function pending_reply_posts()
returns table(story_id uuid, text text, intent text, category text,
              anonymous boolean, created_at timestamptz, umbrella_count int)
language sql security definer set search_path = public stable as $$
  select q.story_id, s.text, s.intent, s.category, s.anonymous, s.created_at, s.umbrella_count
  from owner_reply_queue q join stories s on s.id = q.story_id
  where q.replied = false and s.state = 'live'
    and exists (select 1 from profiles where id = auth.uid() and is_moderator)
  order by s.created_at desc
$$;
grant execute on function pending_reply_posts() to authenticated;

-- Post the owner's typed reply as a random member (bot), so it appears in the
-- poster's inbox as "someone left you a word" and stays out of the real metrics.
create or replace function reply_as_bot(sid uuid, body text) returns void
language plpgsql security definer set search_path = public as $$
declare bot uuid; a uuid;
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_moderator) then
    raise exception using message = 'not_authorized';
  end if;
  select author_id into a from stories where id = sid;
  select p.id into bot from profiles p
   where p.is_bot and p.id <> a
     and not exists (select 1 from umbrellas u where u.story_id = sid and u.user_id = p.id)
   order by random() limit 1;
  if bot is null then raise exception using message = 'no_bot_available'; end if;
  insert into umbrellas (story_id, user_id, note) values (sid, bot, nullif(btrim(body), ''));
  update owner_reply_queue set replied = true, replied_at = now() where story_id = sid;
end $$;
grant execute on function reply_as_bot(uuid, text) to authenticated;

create or replace function mark_replied(sid uuid) returns void
language sql security definer set search_path = public as $$
  update owner_reply_queue set replied = true, replied_at = now()
  where story_id = sid and exists (select 1 from profiles where id = auth.uid() and is_moderator);
$$;
grant execute on function mark_replied(uuid) to authenticated;

-- ============================================================
--  4) Analytics EXCLUDE bots (owner-facing dashboards = real users only).
--     Same signatures as metrics_v2.sql; only the internals filter is_bot.
-- ============================================================
drop function if exists engagement_stats();
create or replace function engagement_stats()
returns table(users bigint, posters bigint, never_posted bigint, never_pct numeric,
  stories bigint, umbrellas bigint, replies bigint,
  avg_posts numeric, avg_umbrellas numeric, avg_replies numeric)
language plpgsql security definer set search_path = public as $$
declare u bigint; p bigint; s bigint; um bigint; rp bigint;
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_moderator) then
    raise exception using message = 'not_authorized';
  end if;
  select count(*) into u  from public.profiles where not coalesce(is_bot, false);
  select count(distinct st.author_id) into p from public.stories st
    join public.profiles pr on pr.id = st.author_id where not coalesce(pr.is_bot, false);
  select count(*) into s  from public.stories st
    join public.profiles pr on pr.id = st.author_id where not coalesce(pr.is_bot, false);
  select count(*) into um from public.umbrellas ub
    join public.profiles pr on pr.id = ub.user_id where not coalesce(pr.is_bot, false);
  select count(*) into rp from public.umbrellas ub
    join public.profiles pr on pr.id = ub.user_id
    where not coalesce(pr.is_bot, false) and ub.note is not null and btrim(ub.note) <> '';
  return query select
    u, p, (u - p),
    round(((u - p)::numeric / nullif(u, 0)) * 100, 1),
    s, um, rp,
    round(s::numeric  / nullif(u, 0), 2),
    round(um::numeric / nullif(u, 0), 2),
    round(rp::numeric / nullif(u, 0), 2);
end $$;
grant execute on function engagement_stats() to authenticated;

drop function if exists activity_by_day(int);
create or replace function activity_by_day(days int default 30)
returns table(day date, views bigint, stories bigint, umbrellas bigint, active_users bigint, registrations bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_moderator) then
    raise exception using message = 'not_authorized';
  end if;
  return query
  with span as (
    select d::date as day
    from generate_series(
      ((now() at time zone 'America/Vancouver')::date - (greatest(days, 1) - 1))::timestamp,
      (now() at time zone 'America/Vancouver')::date::timestamp, interval '1 day') d
  ),
  st as (select (s.created_at at time zone 'America/Vancouver')::date as day, count(*) as c
         from public.stories s join public.profiles pr on pr.id = s.author_id
         where not coalesce(pr.is_bot, false) group by 1),
  um as (select (u.created_at at time zone 'America/Vancouver')::date as day, count(*) as c
         from public.umbrellas u join public.profiles pr on pr.id = u.user_id
         where not coalesce(pr.is_bot, false) group by 1),
  au as (select ua.day as day, count(*) as c
         from public.user_activity ua join public.profiles pr on pr.id = ua.user_id
         where not coalesce(pr.is_bot, false) group by 1),
  rg as (select (pr.created_at at time zone 'America/Vancouver')::date as day, count(*) as c
         from public.profiles pr where not coalesce(pr.is_bot, false) group by 1)
  select sp.day,
         coalesce(dv.views_real, 0)::bigint,
         coalesce(st.c, 0)::bigint,
         coalesce(um.c, 0)::bigint,
         coalesce(au.c, 0)::bigint,
         coalesce(rg.c, 0)::bigint
  from span sp
  left join public.daily_views dv on dv.day = sp.day
  left join st on st.day = sp.day
  left join um on um.day = sp.day
  left join au on au.day = sp.day
  left join rg on rg.day = sp.day
  order by sp.day;
end $$;
grant execute on function activity_by_day(int) to anon, authenticated;

-- ============================================================
--  Backfill: give EXISTING real live posts a target so the drip picks them up.
--  (Bot-authored posts are left alone — they keep their seeded counts.)
-- ============================================================
update stories s set umbrella_target = 45 + floor(random() * 11)::int
from profiles pr
where pr.id = s.author_id
  and not coalesce(pr.is_bot, false)
  and s.state = 'live'
  and s.umbrella_target is null;

-- HEAD START for existing real posts still near zero: top each up to ~5 bot
-- umbrellas right now, so nothing sits empty while the drip catches up.
insert into umbrellas (story_id, user_id, created_at)
select t.id, b.id, now() - (random() * interval '45 minutes')
from (
  select s.id, s.author_id,
         (4 + floor(random() * 4)::int) as want,
         (select count(*) from umbrellas u join profiles p on p.id = u.user_id
          where u.story_id = s.id and p.is_bot) as have
  from stories s join profiles pr on pr.id = s.author_id
  where not coalesce(pr.is_bot, false) and s.state = 'live' and s.umbrella_target is not null
) t
cross join lateral (
  select p.id from profiles p
  where p.is_bot and p.id <> t.author_id
    and not exists (select 1 from umbrellas u where u.story_id = t.id and u.user_id = p.id)
  order by random()
  limit greatest(0, t.want - t.have)
) b
on conflict (story_id, user_id) do nothing;

-- ---------- IS THE DRIP ACTUALLY RUNNING? ----------
-- Reports whether pg_cron is enabled and the job is scheduled.
do $$
declare job_ct int;
begin
  if to_regclass('cron.job') is null then
    raise notice '⚠ pg_cron is NOT enabled — the drip will NOT run on its own. Enable it (Dashboard → Database → Extensions → pg_cron), then re-run this file. You can still test by hand: select drip_umbrellas();';
  else
    execute 'select count(*) from cron.job where jobname = ''umbrella-drip''' into job_ct;
    if job_ct > 0 then
      raise notice '✅ pg_cron on, ''umbrella-drip'' scheduled — posts fill to ~50 over 24h.';
    else
      raise notice '⚠ pg_cron on but ''umbrella-drip'' is NOT scheduled. Run: select cron.schedule(''umbrella-drip'',''*/5 * * * *'',''select public.drip_umbrellas();'');';
    end if;
  end if;
end $$;

-- ---------- VERIFY ----------
select 'real posts with a target' as metric, count(*)::bigint as value from stories where umbrella_target is not null
union all select 'posts queued for reply', (select count(*) from owner_reply_queue where replied = false)
union all select 'real members (engagement)', (select count(*) from profiles where not coalesce(is_bot, false))
union all select 'bot umbrellas on real posts',
  (select count(*) from umbrellas u join profiles p on p.id = u.user_id
   where p.is_bot and u.story_id in (select id from stories where umbrella_target is not null));

-- Run drip once by hand to prove it works, then watch a few posts fill:
--   select drip_umbrellas();
--   select s.id, s.created_at, s.umbrella_target,
--          round(extract(epoch from now()-s.created_at)/3600, 1) as age_hrs,
--          (select count(*) from umbrellas u join profiles p on p.id=u.user_id
--           where u.story_id=s.id and p.is_bot) as bot_umbrellas
--   from stories s where s.umbrella_target is not null
--   order by s.created_at desc limit 10;
-- Check the schedule + recent runs (needs pg_cron):
--   select jobname, schedule, active from cron.job;
--   select status, return_message, start_time from cron.job_run_details order by start_time desc limit 10;
