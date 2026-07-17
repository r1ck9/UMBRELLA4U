-- ============================================================
--  One-shot catch-up. Brings every queued real post up to where its 24-hour
--  schedule says it should be RIGHT NOW (no per-run cap) — fixes posts stuck
--  "behind" because the cron drip hasn't been advancing them.
--  Safe/idempotent. Run in the Supabase SQL Editor.
-- ============================================================

-- Is anything actually running the drip on a schedule?
do $$
begin
  if to_regclass('cron.job') is null then
    raise notice 'pg_cron is NOT enabled — nothing advances the drip automatically, so posts stay "behind". Enable it (Dashboard > Database > Extensions > pg_cron), then re-run bot_engine.sql. This script still catches posts up once, by hand.';
  else
    raise notice 'pg_cron is present. If posts were still behind, check: select status, start_time, return_message from cron.job_run_details order by start_time desc limit 5;';
  end if;
end $$;

-- Fill each queued post up to its scheduled "due" amount now.
insert into umbrellas (story_id, user_id, created_at)
select t.id, b.id,
       greatest(t.created_at, now() - interval '24 hours')
         + random() * (now() - greatest(t.created_at, now() - interval '24 hours'))
from (
  select s.id, s.author_id, s.created_at,
         floor(s.umbrella_target * least(1.0, extract(epoch from now() - s.created_at) / 86400.0))::int as due,
         (select count(*) from umbrellas u join profiles p on p.id = u.user_id
          where u.story_id = s.id and p.is_bot) as have
  from stories s
  where s.state = 'live' and s.umbrella_target is not null
) t
cross join lateral (
  select p.id from profiles p
  where p.is_bot and (t.author_id is null or p.id <> t.author_id)
    and not exists (select 1 from umbrellas u where u.story_id = t.id and u.user_id = p.id)
  order by random()
  limit greatest(0, t.due - t.have)
) b
on conflict (story_id, user_id) do nothing;

-- Verify: newest real posts, their target, and where they sit now.
select left(s.text, 50) as post,
       round(extract(epoch from now() - s.created_at) / 3600, 1) as age_hrs,
       s.umbrella_target as target,
       (select count(*) from umbrellas u join profiles p on p.id = u.user_id
        where u.story_id = s.id and p.is_bot) as bot_likes
from stories s join profiles pr on pr.id = s.author_id
where not coalesce(pr.is_bot, false) and s.state = 'live'
order by s.created_at desc limit 10;
