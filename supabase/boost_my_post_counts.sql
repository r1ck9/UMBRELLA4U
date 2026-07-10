-- Bump umbrella (and matching hug) counts on the founder's OWN posts.
-- Targets stories authored by these three accounts, by email. Each post gets a
-- varied count (50–80) so they don't all show an identical, obviously fake
-- number. Re-runnable (re-rolls the numbers each run).
--
-- Note: these counts aren't backed by real rows in umbrellas/hugs, so the
-- "faces" on the post will be empty and this displays inflated social proof to
-- real visitors. It only touches your own posts, not anyone else's.

update stories s
set umbrella_count = v.n,
    hug_count      = v.n            -- an umbrella is a hug; keep them aligned
from (select id, 50 + floor(random() * 31)::int as n from stories) v
where s.id = v.id
  and s.author_id in (
    select id from auth.users
    where lower(email) in (
      'ricky.chenruiqi@gmail.com',
      'ricky.chenruiqi@outlook.com',
      'ricky20110513@gmail.com'
    )
  );
