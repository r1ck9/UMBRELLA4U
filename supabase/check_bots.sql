-- ============================================================
--  Quick bot health check. Paste into the Supabase SQL Editor and Run.
--  Raw queries — no moderator login needed.
-- ============================================================

-- 1) Fleet + recent activity. bots > 0 and added_last_1h > 0 means it's alive.
select
  (select count(*) from profiles where is_bot)                                                                           as bots,
  (select count(*) from umbrellas u join profiles p on p.id = u.user_id where p.is_bot)                                  as bot_umbrellas_total,
  (select count(*) from umbrellas u join profiles p on p.id = u.user_id where p.is_bot and u.created_at > now() - interval '1 hour')  as added_last_1h,
  (select count(*) from umbrellas u join profiles p on p.id = u.user_id where p.is_bot and u.created_at > now() - interval '24 hours') as added_last_24h;

-- 2) Newest REAL posts and their bot-umbrella count.
--    A brand-new post should already show 3-6 (the head start), and older ones
--    should be climbing toward umbrella_target (~50).
select left(s.text, 60) as post,
       round(extract(epoch from now() - s.created_at) / 3600, 1) as age_hrs,
       s.umbrella_target as target,
       (select count(*) from umbrellas u join profiles p on p.id = u.user_id
        where u.story_id = s.id and p.is_bot) as bot_likes
from stories s join profiles pr on pr.id = s.author_id
where not coalesce(pr.is_bot, false) and s.state = 'live'
order by s.created_at desc
limit 10;

-- 3) Is the automatic drip scheduled?
do $$
begin
  if to_regclass('cron.job') is null then
    raise notice 'pg_cron is NOT enabled — the 24h ramp will not run on its own (the head-start on new posts still works).';
  else
    raise notice 'pg_cron is enabled — run the two commented queries below to see the job + its last runs.';
  end if;
end $$;
-- select jobname, schedule, active from cron.job where jobname = 'umbrella-drip';
-- select status, start_time, return_message from cron.job_run_details order by start_time desc limit 5;

-- 4) Prove the drip works right now: run it once, then re-run query (2) above and
--    watch "behind" posts tick up. (Returns nothing — that's normal.)
select drip_umbrellas();
