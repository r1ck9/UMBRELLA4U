-- ============================================================
--  Umbrella — add anonymous seed posts (→ 100+ stories) and set the community
--  umbrella total to EXACTLY 3000. Run ONCE in the Supabase SQL Editor.
--
--  This does everything in one run:
--   0. Ensures the DISPLAYED totals (Rail + banner) SUM umbrella_count, so the
--      3000 actually shows on the site (this was the missing piece before).
--   A. Inserts 60 anonymous seed posts (tagged seed_batch = 2). Dedup-safe: it
--      deletes seed_batch=2 first, so re-running does NOT create duplicates.
--   B. Distributes umbrella_count across seed posts so the grand total over
--      live stories is exactly 3000 (non-seed / real posts untouched).
--   C. Prints the result so you can confirm it says 3000.
--
--  Undo everything seeded:  delete from stories where seed = true;
-- ============================================================

-- 0) make the displayed totals sum umbrella_count (match the posts)
create or replace function community_umbrellas() returns bigint
language sql security definer set search_path = public stable as $$
  select coalesce(sum(umbrella_count), 0)::bigint from stories where state = 'live'
$$;
grant execute on function community_umbrellas() to anon, authenticated;

create or replace function community_pulse()
returns table(umbrellas bigint, stories bigint, members bigint, umbrellas_today bigint)
language sql security definer set search_path = public stable as $$
  select
    (select coalesce(sum(umbrella_count), 0)::bigint from stories where state = 'live'),
    (select count(*) from stories where state = 'live'),
    (select count(*) from profiles),
    (select count(*) from umbrellas where created_at >= app_day_start())
$$;
grant execute on function community_pulse() to anon, authenticated;

-- columns
alter table stories add column if not exists seed       boolean default false;
alter table stories add column if not exists seed_batch int;

-- ---------- Part A: 60 anonymous seed posts (dedup-safe) ----------
delete from stories where seed_batch = 2;   -- clear this batch first → no duplicates on re-run

insert into stories (text, intent, category, content_warning, anonymous, seed, seed_batch, created_at) values
  ($$Failed my math test again even though I studied all week. Not looking for advice, I just need to say it hurt.$$, 'listen','school', false, true, true, 2, now() - interval '14 days'),
  ($$How do you actually make friends in a new class when everyone already knows each other?$$, 'advice','school', false, true, true, 2, now() - interval '14 days'),
  ($$Some mornings getting out of bed feels like the hardest thing I'll do all day. Today I did it.$$, 'listen','mind', true, true, true, 2, now() - interval '13 days'),
  ($$Told one person my real pronouns this week and they just... used them. I didn't know it could be that simple.$$, 'similar','identity', true, true, true, 2, now() - interval '13 days'),
  ($$Cleaned my whole room after weeks of it being a disaster. Small, but I can breathe in here now.$$, 'similar','wins', false, true, true, 2, now() - interval '13 days'),
  ($$My parents want me to be a doctor. I want to make music. We don't really talk about it anymore.$$, 'listen','culture', false, true, true, 2, now() - interval '12 days'),
  ($$Just need to say my group chat is exhausting and I'm tired of pretending to laugh.$$, 'listen','vent', false, true, true, 2, now() - interval '12 days'),
  ($$Anyone have ways to quiet an anxious brain late at night? Mine won't shut off.$$, 'advice','mind', true, true, true, 2, now() - interval '12 days'),
  ($$Raised my hand for the first time all semester today. Heart was pounding but I did it.$$, 'similar','school', false, true, true, 2, now() - interval '11 days'),
  ($$Got my first job. Bagging groceries, but it's mine and I'm proud.$$, 'similar','wins', false, true, true, 2, now() - interval '11 days'),
  ($$Still figuring out who I am and everyone keeps asking me to have it figured out already.$$, 'listen','identity', true, true, true, 2, now() - interval '11 days'),
  ($$Made a dish from my grandma's recipe and it tasted like home for the first time since we moved.$$, 'similar','culture', false, true, true, 2, now() - interval '10 days'),
  ($$I smiled all day at school and cried the second I got home. Just putting that somewhere.$$, 'listen','mind', true, true, true, 2, now() - interval '10 days'),
  ($$How do you deal with a teacher who clearly doesn't like you?$$, 'advice','school', false, true, true, 2, now() - interval '10 days'),
  ($$Went a whole week without checking my ex's profile. Might not sound big but it is for me.$$, 'similar','wins', false, true, true, 2, now() - interval '9 days'),
  ($$I'm so tired of being the mediator between my parents. I'm fifteen.$$, 'listen','vent', false, true, true, 2, now() - interval '9 days'),
  ($$Does anyone else feel guilty for resting? Like I have to earn the right to relax?$$, 'similar','mind', true, true, true, 2, now() - interval '9 days'),
  ($$Are there free hotlines or texts for when things get really heavy at night? Asking for me.$$, 'resources','mind', true, true, true, 2, now() - interval '8 days'),
  ($$Wore what I actually wanted to wear today instead of what's "safe." Felt like me.$$, 'similar','identity', false, true, true, 2, now() - interval '8 days'),
  ($$Everyone got into the friend-group photo except me. I know it's small. It still stung.$$, 'listen','school', false, true, true, 2, now() - interval '8 days'),
  ($$Being the translator for my family at every appointment is a lot. Nobody asks if I'm okay.$$, 'listen','culture', false, true, true, 2, now() - interval '8 days'),
  ($$Stood up for a kid getting picked on today. Scared the whole time, but I'd do it again.$$, 'similar','wins', false, true, true, 2, now() - interval '7 days'),
  ($$How do you stop apologizing for everything? I say sorry like fifty times a day.$$, 'advice','mind', false, true, true, 2, now() - interval '7 days'),
  ($$Studied with someone instead of alone for once and actually understood it. Sharing in case it helps.$$, 'similar','school', false, true, true, 2, now() - interval '7 days'),
  ($$I don't have the words for how I feel about my body most days. Just needed to not hold it alone.$$, 'listen','identity', true, true, true, 2, now() - interval '7 days'),
  ($$My sibling gets away with everything and I get blamed for everything. That's the whole post.$$, 'listen','vent', false, true, true, 2, now() - interval '6 days'),
  ($$Started going on a short walk every day. Doesn't fix everything, but it helps more than I expected.$$, 'similar','mind', false, true, true, 2, now() - interval '6 days'),
  ($$Any tips or sites for applying to scholarships when your parents can't help?$$, 'resources','school', false, true, true, 2, now() - interval '6 days'),
  ($$First time I said no to plans I didn't want to go to. No excuse, just no. Felt powerful.$$, 'similar','wins', false, true, true, 2, now() - interval '6 days'),
  ($$New to this country. I understand the words but not the jokes yet. It's lonely in a specific way.$$, 'listen','culture', false, true, true, 2, now() - interval '5 days'),
  ($$How do you focus on homework when home is really loud and stressful?$$, 'advice','school', false, true, true, 2, now() - interval '5 days'),
  ($$Told a friend I wasn't okay. Scariest text ever. She just said "I'm here." That was enough.$$, 'similar','mind', true, true, true, 2, now() - interval '5 days'),
  ($$Cut my hair the way I always wanted. Barely recognize myself and I love it.$$, 'similar','identity', false, true, true, 2, now() - interval '5 days'),
  ($$Passed the class everyone said I'd fail. Cried in the hallway. Good tears.$$, 'similar','wins', false, true, true, 2, now() - interval '4 days'),
  ($$So done with people saying "just be positive" like that fixes anything.$$, 'listen','vent', false, true, true, 2, now() - interval '4 days'),
  ($$What actually helps with panic attacks in public? I had one on the bus today.$$, 'advice','mind', true, true, true, 2, now() - interval '4 days'),
  ($$Spoke my first language with a stranger who spoke it too. We both lit up. Missed that sound.$$, 'similar','culture', false, true, true, 2, now() - interval '4 days'),
  ($$I work so hard and it's never the top grade and I'm tired of feeling like it's not enough.$$, 'listen','school', false, true, true, 2, now() - interval '4 days'),
  ($$Looking for calming apps that are actually free, not the ones that lock everything behind a paywall.$$, 'resources','mind', false, true, true, 2, now() - interval '3 days'),
  ($$Made eye contact and ordered my own food today. Anxiety said no. I did it anyway.$$, 'similar','wins', false, true, true, 2, now() - interval '3 days'),
  ($$Came out to my journal before anyone else. Baby steps count too, right?$$, 'listen','identity', true, true, true, 2, now() - interval '3 days'),
  ($$Some days "I got through it" is the whole win. Today was one of those.$$, 'similar','mind', false, true, true, 2, now() - interval '3 days'),
  ($$How do you keep going when you're burnt out but the year isn't over?$$, 'advice','school', false, true, true, 2, now() - interval '3 days'),
  ($$Everyone forgot my birthday. I'm not going to make it a thing, but I needed to say it somewhere.$$, 'listen','vent', false, true, true, 2, now() - interval '2 days'),
  ($$Caught between two cultures and feeling like I'm not enough of either. Anyone get this?$$, 'similar','culture', false, true, true, 2, now() - interval '2 days'),
  ($$Apologized first for once. It was hard. We're okay now.$$, 'similar','wins', false, true, true, 2, now() - interval '2 days'),
  ($$The noise in my head was loud today. I'm still here though.$$, 'listen','mind', true, true, true, 2, now() - interval '2 days'),
  ($$Joined a club alone and someone actually saved me a seat. Small kindness, huge to me.$$, 'similar','school', false, true, true, 2, now() - interval '2 days'),
  ($$Any resources for teens whose families don't "believe in" therapy?$$, 'resources','culture', true, true, true, 2, now() - interval '2 days'),
  ($$First time someone asked my pronouns instead of assuming. Felt seen.$$, 'similar','identity', false, true, true, 2, now() - interval '38 hours'),
  ($$Finished a book for fun for the first time in years. Reading feels like mine again.$$, 'similar','wins', false, true, true, 2, now() - interval '34 hours'),
  ($$How do you tell your parents you might need to talk to someone, without them freaking out?$$, 'advice','mind', true, true, true, 2, now() - interval '30 hours'),
  ($$Presentation went badly and I've replayed it a hundred times. Just need to let it go here.$$, 'listen','school', false, true, true, 2, now() - interval '26 hours'),
  ($$Tired of group projects where I do everything and everyone gets the same grade.$$, 'listen','vent', false, true, true, 2, now() - interval '22 hours'),
  ($$Taught my friend a word in my language today and they kept using it. Made me happy.$$, 'similar','culture', false, true, true, 2, now() - interval '18 hours'),
  ($$Got out of bed, showered, ate. Three days ago that felt impossible. Counting it.$$, 'similar','wins', true, true, true, 2, now() - interval '14 hours'),
  ($$I don't want to label anything yet, and I'm learning that's allowed.$$, 'listen','identity', false, true, true, 2, now() - interval '10 hours'),
  ($$Reminding myself and anyone reading: a bad day is a bad day, not a bad life.$$, 'similar','mind', true, true, true, 2, now() - interval '6 hours'),
  ($$How do you make yourself care about school again when you've stopped?$$, 'advice','school', false, true, true, 2, now() - interval '3 hours'),
  ($$Said hi first to someone new today. They smiled. Tiny brave thing.$$, 'similar','wins', false, true, true, 2, now() - interval '1 hour');

-- ---------- Part B: set community umbrella total to EXACTLY 3000 ----------
with params as (
  select greatest(0, 3000 - coalesce((
    select sum(umbrella_count) from stories
    where state = 'live' and coalesce(seed, false) = false
  ), 0)) as target
),
seedlive as (select id, random() as w from stories where state = 'live' and seed = true),
tot as (select nullif(sum(w), 0) as sw from seedlive),
alloc as (
  select s.id,
         (s.w / t.sw) * p.target as exact,
         floor((s.w / t.sw) * p.target)::int as base
  from seedlive s cross join tot t cross join params p
),
rema as (
  select a.id, a.base,
         ((select target from params) - coalesce(sum(a.base) over (), 0)) as remaining,
         row_number() over (order by (a.exact - a.base) desc, a.id) as rk
  from alloc a
)
update stories st
set umbrella_count = rema.base + (case when rema.rk <= rema.remaining then 1 else 0 end)
from rema
where st.id = rema.id;

-- ---------- Part C: confirm (all three numbers should agree) ----------
select
  community_umbrellas()                                                as rail_total,
  (select umbrellas from community_pulse())                           as banner_total,
  (select count(*) from stories where state = 'live')                 as live_posts;
