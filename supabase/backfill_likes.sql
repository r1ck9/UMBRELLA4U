-- ============================================================
--  Catch-up: give every real post that's still near zero its head-start
--  umbrellas now, and ensure it has a drip target so it keeps climbing.
--  Idempotent — only tops posts UP to ~5; never touches well-liked ones.
--  Run in the Supabase SQL Editor.
-- ============================================================

-- 1) make sure every real, live post has a drip target
update stories s set umbrella_target = 45 + floor(random() * 11)::int
where s.state = 'live' and s.umbrella_target is null
  and coalesce(s.seed, false) = false
  and (s.author_id is null
       or not exists (select 1 from profiles p where p.id = s.author_id and p.is_bot));

-- 2) top real posts up to ~5 bot umbrellas (timestamps spread over the last ~40 min)
insert into umbrellas (story_id, user_id, created_at)
select t.id, b.id, now() - (random() * interval '40 minutes')
from (
  select s.id, s.author_id,
         (4 + floor(random() * 4)::int) as want,
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
  limit greatest(0, t.want - t.have)
) b
on conflict (story_id, user_id) do nothing;
