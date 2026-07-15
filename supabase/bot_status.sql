-- ============================================================
--  Bot status board. Run this file once to install, then anytime:
--      select * from bot_status();
--  Gives a one-glance readout: fleet size, content, drip health (are real
--  posts filling toward ~50 on the 24h schedule?), reply queue, and whether
--  the pg_cron drip job is actually scheduled + when it last ran.
--  Safe to re-run.
-- ============================================================
create or replace function bot_status()
returns table(metric text, value text)
language plpgsql security definer set search_path = public stable as $$
declare cron_line text; sched int; lastrun text;
begin
  -- pg_cron / drip-engine health
  if to_regclass('cron.job') is null then
    cron_line := '⚠ NOT enabled — drip is not running automatically';
  else
    execute 'select count(*) from cron.job where jobname = ''umbrella-drip''' into sched;
    if sched = 0 then
      cron_line := '⚠ enabled, but umbrella-drip is NOT scheduled';
    else
      begin
        execute 'select to_char(start_time,''Mon DD HH24:MI'')||'' · ''||status
                 from cron.job_run_details d join cron.job j on j.jobid = d.jobid
                 where j.jobname = ''umbrella-drip'' order by start_time desc limit 1'
          into lastrun;
      exception when others then lastrun := null;
      end;
      cron_line := '✅ scheduled · last run: ' || coalesce(lastrun, 'no runs recorded yet');
    end if;
  end if;

  return query
  with rp as (   -- real posts under the drip
    select s.id, s.umbrella_target as tgt, s.created_at,
           (select count(*) from umbrellas u join profiles p on p.id = u.user_id
            where u.story_id = s.id and p.is_bot) as have,
           floor(s.umbrella_target
                 * least(1.0, extract(epoch from now() - s.created_at) / 86400.0))::int as due
    from stories s
    where s.state = 'live' and s.umbrella_target is not null
  )
  select t.metric, t.value from (
    select 1  ord, '——— FLEET ———' metric, '' value
    union all select 2,  'bots total',                (select count(*)::text from profiles where is_bot)
    union all select 3,  '· active (posters)',        (select count(*)::text from profiles where bot_kind = 'active')
    union all select 4,  '· lurkers (umbrella-only)', (select count(*)::text from profiles where bot_kind = 'lurker')
    union all select 10, '——— CONTENT ———', ''
    union all select 11, 'bot posts · named',          (select count(*)::text from stories where seed_batch = 3 and anonymous = false)
    union all select 12, 'bot posts · anonymous',      (select count(*)::text from stories where seed_batch = 3 and anonymous = true)
    union all select 13, 'umbrellas given by bots',    (select count(*)::text from umbrellas u join profiles p on p.id = u.user_id where p.is_bot)
    union all select 20, '——— DRIP → real posts ———', ''
    union all select 21, 'real posts being dripped',   (select count(*)::text from rp)
    union all select 22, '· complete (hit ~target)',   (select count(*)::text from rp where have >= tgt)
    union all select 23, '· on track',                 (select count(*)::text from rp where have < tgt and have >= due)
    union all select 24, '· behind schedule',          (select count(*)::text from rp where have < due)
    union all select 25, 'average fill of target',     (select coalesce(round(avg(least(have,tgt)::numeric / nullif(tgt,0)) * 100)::text,'0') || '%' from rp)
    union all select 26, 'bot umbrellas on real posts',(select coalesce(sum(have),0)::text from rp)
    union all select 27, 'added by bots · last 1h',     (select count(*)::text from umbrellas u join profiles p on p.id = u.user_id where p.is_bot and u.created_at > now() - interval '1 hour')
    union all select 28, 'added by bots · last 24h',    (select count(*)::text from umbrellas u join profiles p on p.id = u.user_id where p.is_bot and u.created_at > now() - interval '24 hours')
    union all select 30, '——— REPLIES ———', ''
    union all select 31, 'posts waiting for your reply',(select count(*)::text from owner_reply_queue where replied = false)
    union all select 40, '——— DRIP ENGINE ———', ''
    union all select 41, 'pg_cron', cron_line
  ) t
  order by t.ord;
end $$;
grant execute on function bot_status() to authenticated;

-- show it now
select * from bot_status();
