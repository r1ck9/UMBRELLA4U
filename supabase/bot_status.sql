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
  if not exists (select 1 from profiles where id = auth.uid() and is_moderator) then
    raise exception using message = 'not_authorized';
  end if;
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

-- ============================================================
--  Per-post fake-like breakdown for the mod panel: which real posts the bots
--  are boosting, how far each has filled toward its target, and its schedule
--  status. Moderator-only.
-- ============================================================
create or replace function bot_report_posts(n int default 30)
returns table(post_excerpt text, cat text, is_anon boolean, posted_at timestamptz,
              target_n int, bot_likes bigint, real_likes bigint, pct int, drip_status text)
language plpgsql security definer set search_path = public stable as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_moderator) then
    raise exception using message = 'not_authorized';
  end if;
  return query
  with r as (
    select s.id, left(s.text, 90) as ex, s.category as cg, s.anonymous as an,
           s.created_at as ca, s.umbrella_target as tg,
           (select count(*) from umbrellas u join profiles p on p.id = u.user_id
            where u.story_id = s.id and p.is_bot) as bl,
           (select count(*) from umbrellas u join profiles p on p.id = u.user_id
            where u.story_id = s.id and not coalesce(p.is_bot, false)) as rl,
           floor(s.umbrella_target * least(1.0, extract(epoch from now() - s.created_at) / 86400.0)) as due
    from stories s
    where s.state = 'live' and s.umbrella_target is not null
  )
  select r.ex, r.cg, r.an, r.ca, r.tg, r.bl, r.rl,
         round(least(r.bl, r.tg)::numeric / nullif(r.tg, 0) * 100)::int,
         case when r.bl >= r.tg then 'complete'
              when r.bl >= r.due then 'on track'
              else 'behind' end
  from r
  order by r.ca desc
  limit greatest(1, n);
end $$;
grant execute on function bot_report_posts(int) to authenticated;

-- Bot umbrellas added per hour over the last 24h (for the panel sparkline).
-- Returns exactly 24 buckets (zero-filled) so the chart is continuous.
create or replace function bot_likes_hourly()
returns table(bucket timestamptz, n bigint)
language plpgsql security definer set search_path = public stable as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_moderator) then
    raise exception using message = 'not_authorized';
  end if;
  return query
  with hrs as (
    select generate_series(date_trunc('hour', now()) - interval '23 hours',
                           date_trunc('hour', now()), interval '1 hour') as bucket
  ),
  c as (
    select date_trunc('hour', u.created_at) as bucket, count(*) as n
    from umbrellas u join profiles p on p.id = u.user_id
    where p.is_bot and u.created_at > now() - interval '24 hours'
    group by 1
  )
  select h.bucket, coalesce(c.n, 0)::bigint
  from hrs h left join c on c.bucket = h.bucket
  order by h.bucket;
end $$;
grant execute on function bot_likes_hourly() to authenticated;

-- View it in the Moderation panel (you're signed in as a moderator there).
-- These functions are moderator-gated, so calling them in the SQL editor
-- (where there's no logged-in user) will report not_authorized — that's expected.
