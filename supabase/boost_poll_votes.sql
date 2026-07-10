-- Bump poll vote tallies into the 20-50 range so polls look active.
-- Sets each option's denormalized vote_count directly (not backed by real
-- poll_votes rows). Re-runnable (re-rolls each run). No voter identities are
-- shown on polls, so there's no faces/count mismatch to notice.
--
-- NOTE: this overwrites the tally on EVERY poll, including any real users'
-- polls, not just yours. To scope it to your own posts, see the variant below.

update poll_options
set vote_count = 20 + floor(random() * 31)::int;

-- --- Variant: only polls on YOUR OWN posts (comment out the update above,
-- --- uncomment this) ---
-- update poll_options o
-- set vote_count = 20 + floor(random() * 31)::int
-- from stories s, auth.users u
-- where o.story_id = s.id and s.author_id = u.id
--   and lower(u.email) in (
--     'ricky.chenruiqi@gmail.com',
--     'ricky.chenruiqi@outlook.com',
--     'ricky20110513@gmail.com'
--   );
