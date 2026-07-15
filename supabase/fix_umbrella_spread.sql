-- ============================================================
--  Fix the "everything shows 60" tell. The seed capped counts at 60, so ~1 in 6
--  posts piled up at exactly 60. This re-spreads seed & bot posts (umbrella_target
--  IS NULL) to a fresh, varied 8–58 by TRIMMING bot umbrella ROWS — so the counts
--  stay real/row-backed. Real posts under the 24h drip are left alone.
--  Safe to re-run.
-- ============================================================
alter table umbrellas disable trigger user;   -- fast bulk edit; counts recomputed below

-- Trim each affected post's bot umbrellas down to a new random target (8–58).
with tgt as (
  select s.id as story_id, 8 + floor(random() * 51)::int as keep_n
  from stories s
  where s.state = 'live' and s.umbrella_target is null
),
ranked as (
  select u.ctid as cid, u.story_id,
         row_number() over (partition by u.story_id order by random()) as rn
  from umbrellas u
  join profiles p on p.id = u.user_id
  where p.is_bot and u.story_id in (select story_id from tgt)
)
delete from umbrellas u
using ranked r, tgt t
where u.ctid = r.cid and r.story_id = t.story_id and r.rn > t.keep_n;

-- Recompute displayed counts from surviving rows (only the posts we touched).
update stories s set umbrella_count = c.n, hug_count = c.n
from (select story_id, count(*) n from umbrellas group by story_id) c
where s.id = c.story_id and s.umbrella_target is null;
update stories s set umbrella_count = 0, hug_count = 0
where s.umbrella_target is null
  and not exists (select 1 from umbrellas u where u.story_id = s.id);

-- Keep per-bot "umbrellas given" accurate after the trim.
update profiles p set umbrellas_sent = coalesce(c.n, 0)
from (select user_id, count(*) n from umbrellas group by user_id) c
where p.id = c.user_id;
update profiles p set umbrellas_sent = 0
where not exists (select 1 from umbrellas u where u.user_id = p.id);

alter table umbrellas enable trigger user;

-- Confirm the pile-up is gone (no single count should dominate).
select umbrella_count, count(*) as posts
from stories where state = 'live' and umbrella_target is null
group by umbrella_count order by posts desc limit 12;
