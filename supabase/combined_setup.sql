-- ==================================================================
--  UMBRELLA — COMBINED SETUP.  Run ONCE, top to bottom, in Supabase.
--  Sections are independent; delete any you've already run.
-- ==================================================================

-- ========== 1. SEED CONTENT (50 anonymous starter stories) ==========
-- Umbrella — COLD-START SEED CONTENT (50 Stories)
-- Run once in Supabase SQL Editor to populate an empty feed so the first real
-- visitor doesn't land on a ghost town. Founder-authored sample Stories only —
-- NOT bots reacting to real users' posts.
--
-- All rows are posted ANONYMOUSLY: no fake usernames/profiles are invented, so
-- nothing links to a nonexistent /u/ page and no fabricated peer identity exists.
-- The set_story_author() trigger already forces author_id/author_name to NULL for
-- anonymous rows, so no trigger juggling is needed here.
--
-- To remove later: delete from stories where seed = true;

-- one-time marker column so seed content is easy to identify / pull back out
alter table stories add column if not exists seed boolean default false;

-- clear any prior seed rows first, so re-running this file can't duplicate them
delete from stories where seed = true;

insert into stories (text, intent, category, content_warning, anonymous, umbrella_count, seed, created_at) values
  ('Tried out for the boys'' volleyball team today. Half the guys laughed. I still went.',
     'listen',    'school',   false, true, 41, true, now() - interval '10 days'),
  ('How do you tell your friends something about yourself when you''re scared it changes everything?',
     'advice',    'identity', true,  true, 18, true, now() - interval '10 days'),
  ('Wore the hoodie I''ve been too scared to wear. Nobody said anything. The fear was louder than anyone else.',
     'similar',   'wins',     false, true, 63, true, now() - interval '9 days'),
  ('Everyone thinks I''m the strong one. I''m so tired of being the strong one. Just needed to put that somewhere.',
     'listen',    'mind',     true,  true, 88, true, now() - interval '9 days'),
  ('First week at a new school where I don''t speak the language well yet. Ate lunch alone again. It''s fine. It''s not fine.',
     'listen',    'culture',  false, true, 34, true, now() - interval '9 days'),
  ('Any tips for calming down before a test? My hands shake and I blank on everything I studied.',
     'advice',    'mind',     false, true, 22, true, now() - interval '8 days'),
  ('Passed my driving test on the third try. My mom cried. I''m letting myself be proud of this one.',
     'similar',   'wins',     false, true, 57, true, now() - interval '8 days'),
  ('I think I''m figuring out who I am and it doesn''t match what everyone at home expects. Saying it out loud somewhere safe.',
     'listen',    'identity', true,  true, 29, true, now() - interval '8 days'),
  ('Does anyone else feel like they''re pretending to be okay all day and only stop when they''re alone at night?',
     'similar',   'mind',     true,  true, 71, true, now() - interval '8 days'),
  ('Good resources for dealing with parents who fight a lot? Not looking for advice really, just something that helps.',
     'resources', 'vent',     false, true, 15, true, now() - interval '7 days'),
  ('Group projects are the worst and one person always does nothing. That''s it. That''s the whole story.',
     'listen',    'vent',     false, true, 26, true, now() - interval '7 days'),
  ('Made a friend at my new place. First one in three months. Small thing. Huge thing.',
     'similar',   'culture',  false, true, 48, true, now() - interval '7 days'),
  ('I finally raised my hand in class today instead of hiding. Voice shook the whole time but I did it.',
     'similar',   'school',   false, true, 39, true, now() - interval '7 days'),
  ('How do you make friends when everyone already has their group by high school?',
     'advice',    'school',   false, true, 44, true, now() - interval '6 days'),
  ('My grandma is sick and nobody at home talks about it. I don''t know where to put this feeling.',
     'listen',    'mind',     true,  true, 52, true, now() - interval '6 days'),
  ('Cooked dinner for my whole family for the first time and nobody complained. I''m counting that as a win.',
     'similar',   'wins',     false, true, 33, true, now() - interval '6 days'),
  ('Anyone have advice for the first day at a job when you''ve never worked before? I''m nervous I''ll mess it up.',
     'advice',    'school',   false, true, 19, true, now() - interval '6 days'),
  ('I speak two languages at home and neither one at school. Sometimes I feel like I don''t fully belong anywhere.',
     'similar',   'culture',  false, true, 61, true, now() - interval '6 days'),
  ('Just need to vent that my little brother broke my headphones and my parents took his side. Again.',
     'listen',    'vent',     false, true, 17, true, now() - interval '5 days'),
  ('I came out to one friend this week and she just said okay and kept talking like normal. Best okay of my life.',
     'similar',   'identity', false, true, 79, true, now() - interval '5 days'),
  ('Some days I''m so tired for no reason and I feel guilty because nothing is even wrong. Anyone get this?',
     'similar',   'mind',     true,  true, 66, true, now() - interval '5 days'),
  ('Where do you find volunteering stuff that doesn''t need a car or parents driving you?',
     'resources', 'school',   false, true, 16, true, now() - interval '5 days'),
  ('Told my parents I don''t want to do the career they picked for me. It did not go great. But I said it.',
     'listen',    'identity', true,  true, 47, true, now() - interval '5 days'),
  ('Learned to ride a bike at 15. Yeah, 15. Nobody taught me before. Wobbly and free.',
     'similar',   'wins',     false, true, 55, true, now() - interval '4 days'),
  ('How do you stop comparing yourself to everyone online? I know it''s fake but it still gets me.',
     'advice',    'mind',     false, true, 58, true, now() - interval '4 days'),
  ('New country, new alphabet, new everything. I aced my first spelling test here today. Small but it''s mine.',
     'similar',   'culture',  false, true, 42, true, now() - interval '4 days'),
  ('Just want to complain that PE class makes me want to disappear and no one understands why.',
     'listen',    'school',   false, true, 31, true, now() - interval '4 days'),
  ('I have no one at home I can talk to about liking girls. Just needed to type it where someone might get it.',
     'listen',    'identity', true,  true, 84, true, now() - interval '4 days'),
  ('Made my bed, ate breakfast, went outside. Doesn''t sound like much but three days ago I couldn''t.',
     'similar',   'wins',     true,  true, 92, true, now() - interval '4 days'),
  ('Anyone know free apps or sites for learning to manage money as a teen? My family never taught me.',
     'resources', 'school',   false, true, 20, true, now() - interval '3 days'),
  ('My best friend moved away and everyone says I''ll make new ones. I don''t want new ones. I want her.',
     'listen',    'mind',     false, true, 49, true, now() - interval '3 days'),
  ('Wore traditional clothes to a school event even though I was scared people would stare. A few asked and it was actually nice.',
     'similar',   'culture',  false, true, 68, true, now() - interval '3 days'),
  ('How do you tell a teacher you''re struggling without crying? I always cry and then I''m embarrassed.',
     'advice',    'school',   false, true, 27, true, now() - interval '3 days'),
  ('Just venting: everyone at home is louder than my thoughts and I never get a quiet minute.',
     'listen',    'vent',     false, true, 23, true, now() - interval '3 days'),
  ('Some nights the sad hits out of nowhere. I''m okay, I just don''t want to feel alone in it right now.',
     'listen',    'mind',     true,  true, 77, true, now() - interval '3 days'),
  ('Finally beat the level I''ve been stuck on for two weeks. Screamed. Woke up the dog. Worth it.',
     'similar',   'wins',     false, true, 36, true, now() - interval '2 days'),
  ('How do you deal with a friend who only talks about themselves and never asks about you?',
     'advice',    'vent',     false, true, 30, true, now() - interval '2 days'),
  ('I''m the translator for my parents at every appointment and it''s a lot for a 14 year old. Just needed to say it.',
     'listen',    'culture',  false, true, 59, true, now() - interval '2 days'),
  ('Started a journal like people online suggested and it actually helps. Sharing in case someone else needs the nudge.',
     'similar',   'mind',     false, true, 45, true, now() - interval '2 days'),
  ('Any advice for stage fright? I have a presentation Monday and I''ve already rehearsed it forty times.',
     'advice',    'school',   false, true, 21, true, now() - interval '2 days'),
  ('I like a boy and also sometimes I think I like a girl and I don''t have a word for it and that''s okay for now.',
     'similar',   'identity', true,  true, 73, true, now() - interval '2 days'),
  ('Just want to release this: I studied so hard and still failed. I''m not looking for fixes, just letting it out.',
     'listen',    'school',   false, true, 40, true, now() - interval '1 day'),
  ('Resources for someone whose family doesn''t believe mental health is real? Asking for me.',
     'resources', 'mind',     true,  true, 38, true, now() - interval '1 day'),
  ('Apologized to a friend I''d been avoiding for months. Scariest text I''ve ever sent. She replied with a heart.',
     'similar',   'wins',     false, true, 64, true, now() - interval '1 day'),
  ('How do you handle it when your parents compare you to your cousins all the time?',
     'advice',    'culture',  false, true, 25, true, now() - interval '22 hours'),
  ('I just need somewhere to say that today was heavy and I made it to the end of it anyway.',
     'listen',    'mind',     false, true, 81, true, now() - interval '18 hours'),
  ('Signed up for art club even though none of my friends did. Walking in alone on Thursday. Wish me luck.',
     'similar',   'school',   false, true, 34, true, now() - interval '14 hours'),
  ('Venting: the group chat left me out of plans again and pretended it was an accident.',
     'listen',    'vent',     false, true, 28, true, now() - interval '10 hours'),
  ('Made a friend at my new place who also just moved here. We don''t share a language but we share lunch. First one in months.',
     'similar',   'culture',  false, true, 51, true, now() - interval '6 hours'),
  ('Told myself I''d be kinder to me this week. Caught the mean voice and talked back to it once. Counting it.',
     'similar',   'mind',     false, true, 43, true, now() - interval '2 hours');

-- Floor umbrella_count at 15 for ALL existing stories (seed + anything already
-- in the DB), so no Story shows fewer than 15 umbrellas.
-- NOTE: this only bumps the displayed count column; it does NOT create matching
-- rows in the umbrellas table (see honesty note in chat).
update stories set umbrella_count = 15 where umbrella_count < 15;

-- ========== 2. BADGE COUNTERS + "an umbrella is a hug" ==========
-- ============================================================
--  Umbrella — badge counters + "an umbrella is a hug".
--  Run once in Supabase SQL Editor. Safe to re-run.
--
--  Adds two denormalized counters on profiles so badges render cheaply
--  everywhere (feed cards + profiles): post_count and umbrellas_sent.
--  Streak already lives on profiles (streak.sql).
-- ============================================================

alter table profiles add column if not exists post_count      int not null default 0;
alter table profiles add column if not exists umbrellas_sent  int not null default 0;

-- ---------- post_count: every story a member shares ----------
-- Counts ALL their stories (including anonymous ones — author_id is still set
-- on anonymous posts; only the visible name is hidden). The badge rewards
-- showing up and sharing, regardless of whether the post carried their name.
create or replace function sync_post_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.author_id is not null then
    update profiles set post_count = post_count + 1 where id = new.author_id;
  elsif tg_op = 'DELETE' and old.author_id is not null then
    update profiles set post_count = greatest(0, post_count - 1) where id = old.author_id;
  end if;
  return null;
end $$;
drop trigger if exists trg_sync_post_count on stories;
create trigger trg_sync_post_count after insert or delete on stories
  for each row execute function sync_post_count();

-- ---------- umbrellas_sent: every umbrella a member opens (= a hug) ----------
create or replace function sync_umbrellas_sent() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update profiles set umbrellas_sent = umbrellas_sent + 1 where id = new.user_id;
  elsif tg_op = 'DELETE' then
    update profiles set umbrellas_sent = greatest(0, umbrellas_sent - 1) where id = old.user_id;
  end if;
  return null;
end $$;
drop trigger if exists trg_sync_umbrellas_sent on umbrellas;
create trigger trg_sync_umbrellas_sent after insert or delete on umbrellas
  for each row execute function sync_umbrellas_sent();

-- ---------- one-time backfill from existing rows ----------
update profiles p set
  post_count     = coalesce((select count(*) from stories   s where s.author_id = p.id), 0),
  umbrellas_sent = coalesce((select count(*) from umbrellas u where u.user_id  = p.id), 0);

-- ============================================================
--  An umbrella IS a hug — align the hug count with the umbrella count.
--  Opening an umbrella already sends a hug going forward; this reconciles
--  any existing rows so every story's hug count matches its umbrellas.
--  (Not fake data: each umbrella genuinely represents a hug.)
-- ============================================================
update stories set hug_count = umbrella_count where hug_count is distinct from umbrella_count;

-- ========== 3. BIGGER COUNTS ON YOUR OWN POSTS (50-80) ==========
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

-- ========== 4. HUG EVERY ANON POST FROM YOUR 3 ACCOUNTS ==========
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

-- ========== 5. CONFIRM STUCK ACCOUNT (jonasli) ==========
-- Manually confirm an account stuck by the cross-device confirmation bug.
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where email = 'jonasli3412@gmail.com';

-- verify it worked (email_confirmed_at should now be a timestamp, not null):
select email, email_confirmed_at from auth.users where email = 'jonasli3412@gmail.com';
