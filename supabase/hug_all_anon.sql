-- Send a hug from each of the 3 founder accounts to every anonymous live post.
-- Real, attributable hug rows (so the hugger faces actually show these accounts)
-- — not a fake count bump. Skips posts these accounts authored (no self-hugs).
-- The hug_count trigger updates automatically. on conflict = safe to re-run.

insert into hugs (story_id, user_id)
select s.id, u.id
from stories s
cross join auth.users u
where s.anonymous = true
  and s.state = 'live'
  and u.email in (
    'ricky.chenruiqi@gmail.com',
    'ricky.chenruiqi@outlook.com',
    'ricky20110513@gmail.com'
  )
  and s.author_id is distinct from u.id
on conflict (story_id, user_id) do nothing;
