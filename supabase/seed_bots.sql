-- ============================================================
--  Umbrella — SEED BOTS (real, measurable, non-anonymous accounts)
--
--  SOCIAL-EXPERIMENT SEED. Per CLAUDE.md: this project is a private social
--  experiment, not public-facing, and bot-generated data is an intended part
--  of it. Everything here is scoped strictly to this project.
--
--  What this does (run ONCE in the Supabase SQL Editor — safe to re-run):
--    0. Adds is_bot on profiles + a bot_metrics view  → the MEASUREMENT layer.
--    A. Creates real auth.users bot accounts (fake emails). The handle_new_user
--       trigger auto-creates their profiles row, so they DO count in the
--       registration analytics (profiles / activity_by_day registrations).
--    B. Gives each bot a real profile (username, display name, bio) and posts
--       Stories NON-ANONYMOUSLY (author_id + author_name set, anonymous=false),
--       so their name shows on every post and on their /u/<username> page.
--    C. Bots open umbrellas on each other's + the existing seed posts. These are
--       REAL rows in the umbrellas table, so the triggers bump:
--         - stories.umbrella_count      (→ community_umbrellas() grand total)
--         - profiles.umbrellas_sent     (per-bot "umbrellas given")
--       and the rows feed community_pulse (umbrellas_today), engagement_stats,
--       and activity_by_day. Counts are backed by real rows in EVERY surface.
--    D. Aligns hug_count = umbrella_count (project invariant: an umbrella is a hug).
--    E. Backfills user_activity so bots also register as ACTIVE users (if that
--       table exists).
--
--  Undo everything this created:
--    delete from umbrellas u using profiles p where u.user_id=p.id and p.is_bot;
--    delete from stories where seed_batch = 3;
--    delete from auth.users where email like '%@bots.umbrella4u.ca';
-- ============================================================

-- ---------- 0) MEASUREMENT: is_bot flag (keeps bots inside registration data) ----------
alter table profiles add column if not exists is_bot boolean default false;
comment on column profiles.is_bot is
  'Social-experiment marker. TRUE = seeded bot account. Bots are otherwise real users (real auth row, real profile, real posts/umbrellas) so they still count in every metric; this flag lets you segment them out.';
create index if not exists idx_profiles_is_bot on profiles(is_bot) where is_bot;

-- guard columns that other migrations may not have installed yet
alter table stories  add column if not exists seed       boolean default false;
alter table stories  add column if not exists seed_batch int;
alter table stories  add column if not exists hug_count  int default 0;

-- ============================================================
--  Persona + post source data (temp tables, dropped at end)
-- ============================================================
drop table if exists _bots;
create temp table _bots (
  email text, username text, display_name text, pronouns text,
  status_weather text, about_me text, accent_color text, signup_days_ago int
);

insert into _bots (email, username, display_name, pronouns, status_weather, about_me, accent_color, signup_days_ago) values
 ('quiet_september@bots.umbrella4u.ca','quiet_september','Quiet September','she/her','partly cloudy','grade 11. i overthink texts for like an hour before sending them.','#7c9cbf',28),
 ('mattie_draws@bots.umbrella4u.ca','mattie_draws','Mattie','they/them','clearing up','draws on everything including my hands. bad at math, worse at feelings.','#c96f8f',27),
 ('notthatdeep@bots.umbrella4u.ca','notthatdeep','Ash','he/him','foggy','saying it out loud is the hard part so i type it instead.','#5aa88a',26),
 ('sam_afterdark@bots.umbrella4u.ca','sam_afterdark','Sam','she/they','stormy','night owl. everything feels bigger at 2am and i know it.','#8a7bc8',25),
 ('leaf_on_water@bots.umbrella4u.ca','leaf_on_water','Rue','she/her','drizzle','trying to float instead of sink this year.','#4f9d9d',24),
 ('tired_but_here@bots.umbrella4u.ca','tired_but_here','Devon','he/him','overcast','showing up counts even when it is barely.','#b98b52',23),
 ('juno_maps@bots.umbrella4u.ca','juno_maps','Juno','she/her','sunny','collect bus routes and playlists. moved cities twice.','#d98b4a',22),
 ('the_backrow_kid@bots.umbrella4u.ca','the_backrow_kid','Theo','he/him','partly cloudy','sit in the back so nobody calls on me. hi anyway.','#6b8fb5',21),
 ('raincheck_ren@bots.umbrella4u.ca','raincheck_ren','Ren','they/them','light rain','cancel plans then feel bad about it. working on it.','#a879b8',20),
 ('okay_ish@bots.umbrella4u.ca','okay_ish','Priya','she/her','clearing up','fine is a whole personality and i am tired of it.','#cf7b6b',19),
 ('half_moon_noor@bots.umbrella4u.ca','half_moon_noor','Noor','she/her','breezy','two homes, two languages, one very confused brain.','#5a9bd4',18),
 ('dev_null_kid@bots.umbrella4u.ca','dev_null_kid','Marcus','he/him','clear','codes when i cant sleep. talking to people is the real bug.','#4fae7a',17),
 ('pocket_sun@bots.umbrella4u.ca','pocket_sun','Lily','she/her','sunny','small wins person. i will celebrate literally anything.','#e0a13c',16),
 ('late_bus_liv@bots.umbrella4u.ca','late_bus_liv','Liv','she/her','windy','always running for the bus. always missing it.','#c86f9e',15),
 ('chess_club_dropout@bots.umbrella4u.ca','chess_club_dropout','Omar','he/him','overcast','quit the thing i was good at because it stopped being fun.','#7a8bbf',14),
 ('soft_launch_kai@bots.umbrella4u.ca','soft_launch_kai','Kai','he/they','partly cloudy','testing out being more myself in small doses.','#6fb0a0',13),
 ('two_languages@bots.umbrella4u.ca','two_languages','Elif','she/her','clearing up','i think in one language and dream in another.','#4f9dc4',12),
 ('the_understudy@bots.umbrella4u.ca','the_understudy','Grace','she/her','drizzle','always second choice. practising being okay with that.','#b57bb0',11),
 ('practically_nocturnal@bots.umbrella4u.ca','practically_nocturnal','Zeke','he/him','stormy','sleep schedule is a rumor at this point.','#7b6fc4',10),
 ('min_or_maj@bots.umbrella4u.ca','min_or_maj','Cass','they/them','breezy','music kid. everything reminds me of a song.','#5aa8a0',9),
 ('hallway_ghost@bots.umbrella4u.ca','hallway_ghost','Wren','she/they','foggy','people look through me a lot. maybe thats a superpower.','#8f8fb5',8),
 ('not_a_morning_person@bots.umbrella4u.ca','not_a_morning_person','Jonah','he/him','overcast','7am first period should be illegal.','#c98b52',5),
 ('spare_key_ella@bots.umbrella4u.ca','spare_key_ella','Ella','she/her','clearing up','the friend everyone vents to. nobody asks me back.','#d97b8a',3),
 ('low_battery_lu@bots.umbrella4u.ca','low_battery_lu','Lu','she/her','light rain','running on 12% most days. still running though.','#6f9bc4',2);

drop table if exists _bot_posts;
create temp table _bot_posts (username text, text text, intent text, category text, cw boolean);

insert into _bot_posts (username, text, intent, category, cw) values
 ('quiet_september', $$i rewrote a text to my friend like nine times and then just didn't send it. anyone else do this or is it just me$$, 'similar','mind', false),
 ('quiet_september', $$got picked last in gym again. i'm 16 and it still does something to me i can't explain.$$, 'listen','school', false),
 ('mattie_draws', $$my art teacher held up my sketch to the class as a good example and i wanted to disappear AND live forever at the same time$$, 'similar','wins', false),
 ('mattie_draws', $$how do you tell your parents you want to do something creative when they only see it as a hobby$$, 'advice','culture', false),
 ('notthatdeep', $$told my brother i was struggling and he said "just don't think about it." cool. fixed. thanks.$$, 'listen','vent', false),
 ('notthatdeep', $$anyone got a way to actually fall asleep when your brain starts replaying every dumb thing you've ever done$$, 'advice','mind', true),
 ('sam_afterdark', $$it's 2am and everything feels like the end of the world and i KNOW it won't in the morning but right now it's real$$, 'similar','mind', true),
 ('sam_afterdark', $$made it through a whole week without a 2am spiral. posting so future me remembers it's possible.$$, 'similar','wins', false),
 ('leaf_on_water', $$i said no to a party i didn't want to go to and didn't make up a fake excuse. just no. felt huge.$$, 'similar','wins', false),
 ('leaf_on_water', $$does anyone else feel like they're the side character in their own friend group$$, 'similar','mind', false),
 ('tired_but_here', $$didn't do anything impressive today. got up, went to school, came home. counting it as a win anyway.$$, 'similar','wins', false),
 ('tired_but_here', $$how do you keep going when you're not failing exactly but nothing feels like it matters$$, 'advice','mind', true),
 ('juno_maps', $$moved schools mid-year again. i've gotten really good at the "new kid" walk and i hate that i'm good at it.$$, 'listen','culture', false),
 ('juno_maps', $$made an actual friend today. we bonded over hating the same song on the radio. small but it's something.$$, 'similar','wins', false),
 ('the_backrow_kid', $$the teacher called on me and my mind went completely blank even though i knew it. now i'm replaying it forever.$$, 'similar','school', false),
 ('the_backrow_kid', $$any tips for talking in class without your voice going all shaky$$, 'advice','school', false),
 ('raincheck_ren', $$i cancelled on my friends again and now i feel guilty AND relieved and i don't know what that says about me$$, 'listen','mind', false),
 ('raincheck_ren', $$how do you explain to people that you like them but also need to be alone a lot without them taking it personally$$, 'advice','identity', false),
 ('okay_ish', $$someone asked how i was and i said "good" so fast it scared me. when did that become automatic$$, 'listen','mind', true),
 ('okay_ish', $$i got my chem grade up from a fail to a pass and nobody at home noticed but i'm proud so i'm telling you guys$$, 'similar','wins', false),
 ('half_moon_noor', $$i translate for my mom at every doctor and bank appointment. i'm 15. sometimes i just want to be the kid.$$, 'listen','culture', false),
 ('half_moon_noor', $$anyone else feel not enough of either culture you're from. like you're standing in a doorway.$$, 'similar','identity', false),
 ('dev_null_kid', $$i can build a whole app but i can't send a text to a girl. explain that.$$, 'similar','identity', false),
 ('dev_null_kid', $$stayed up til 4 fixing one bug and it was a missing comma. i wanted to throw my laptop into the sea.$$, 'listen','vent', false),
 ('pocket_sun', $$i watered my plant and it didn't die and honestly that's the highlight of my week and i'm okay with that$$, 'similar','wins', false),
 ('pocket_sun', $$reminder to whoever needs it: you're allowed to be proud of stuff that seems small to everyone else$$, 'listen','mind', false),
 ('late_bus_liv', $$missed the bus, got soaked, showed up late, and the teacher made a comment in front of everyone. cool day.$$, 'listen','vent', false),
 ('late_bus_liv', $$how do you stop caring so much what people think when your whole brain is wired to care$$, 'advice','mind', false),
 ('chess_club_dropout', $$i quit the one thing i was actually good at because it stopped being fun and now people keep asking why$$, 'listen','identity', false),
 ('chess_club_dropout', $$is it normal to feel relieved and sad about the same decision at the same time$$, 'similar','mind', false),
 ('soft_launch_kai', $$asked one friend to use a different name for me and they just... did it. no big deal to them, huge to me.$$, 'similar','identity', true),
 ('soft_launch_kai', $$trying to be more myself but in small doses so it's less scary. baby steps are still steps right$$, 'similar','wins', false),
 ('two_languages', $$i said a word wrong in english today and someone laughed and i've thought about it approximately 400 times since$$, 'listen','culture', false),
 ('two_languages', $$found one other person at school who speaks my first language and we just lit up. missed that sound so much.$$, 'similar','wins', false),
 ('the_understudy', $$i'm always the backup plan. the second call. i know i shouldn't take it personal but it's wearing me down.$$, 'listen','mind', true),
 ('the_understudy', $$how do you actually believe you matter when the evidence keeps saying you're everyone's plan B$$, 'advice','mind', true),
 ('practically_nocturnal', $$my sleep schedule is completely destroyed and every adult acts like i can just "fix" it by wanting to$$, 'listen','vent', false),
 ('practically_nocturnal', $$anyone got things that actually help wind down at night. my brain treats bedtime as brainstorm time.$$, 'resources','mind', false),
 ('min_or_maj', $$put my headphones in and a song came on that felt like it knew exactly what today was. music is unreal sometimes.$$, 'similar','mind', false),
 ('min_or_maj', $$played a song i wrote for one person and they liked it. i've never been that scared and that happy.$$, 'similar','wins', false),
 ('hallway_ghost', $$people talk over me constantly and i've started to wonder if i'd have to yell to be noticed at all$$, 'listen','mind', false),
 ('hallway_ghost', $$does being invisible ever flip into feeling free instead of lonely for anyone or is that just a cope$$, 'similar','identity', false),
 ('not_a_morning_person', $$first period at 7am is a crime and my brain doesn't switch on til lunch. anyone else just surviving mornings$$, 'similar','school', false),
 ('spare_key_ella', $$i'm the one everyone vents to. today i needed someone and realized i don't really have a person for that.$$, 'listen','mind', true),
 ('spare_key_ella', $$how do you ask for support when you've always been the "strong friend" and people assume you're fine$$, 'advice','mind', false),
 ('low_battery_lu', $$running on empty but i still made it to the end of the day. that's the whole update. still here.$$, 'similar','wins', true),
 ('low_battery_lu', $$is it burnout if you're 16. asking because i feel it in my bones and everyone says i'm too young for that.$$, 'advice','mind', true);

-- ============================================================
--  A) Create the real auth.users accounts (fake emails)
--     handle_new_user() fires → a profiles row is created automatically.
--     Only inserts emails that don't already exist → safe to re-run.
--     Fixed dummy bcrypt hash: bots never log in, so no pgcrypto dependency.
-- ============================================================
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  b.email,
  '$2a$10$C6UzMDM.H6dfI/f/IKcEeO3.q0G9y4Qb0m0oK7Z3sJ8b0Xw5m5s2',
  now() - (b.signup_days_ago || ' days')::interval,
  now() - (b.signup_days_ago || ' days')::interval,
  now() - (b.signup_days_ago || ' days')::interval,
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('username', b.username, 'is_bot', true),
  '', '', '', ''
from _bots b
where not exists (select 1 from auth.users u where u.email = b.email);

-- ============================================================
--  B) Fill in each bot's profile (real identity, marked is_bot).
--     Spread profiles.created_at across signup dates so the per-day
--     REGISTRATIONS series in activity_by_day() shows a real curve.
-- ============================================================
update profiles p set
  is_bot         = true,
  username       = b.username,
  display_name   = b.display_name,
  pronouns       = b.pronouns,
  status_weather = b.status_weather,
  about_me       = b.about_me,
  accent_color   = b.accent_color,
  created_at     = now() - (b.signup_days_ago || ' days')::interval
from _bots b
join auth.users u on u.email = b.email
where p.id = u.id;

-- onboarded / discoverable are optional columns in some installs — set if present
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_name='profiles' and column_name='onboarded') then
    update profiles p set onboarded = true from _bots b
    join auth.users u on u.email=b.email where p.id=u.id;
  end if;
  if exists (select 1 from information_schema.columns
             where table_name='profiles' and column_name='discoverable') then
    update profiles p set discoverable = true from _bots b
    join auth.users u on u.email=b.email where p.id=u.id;
  end if;
end $$;

-- ============================================================
--  C) Bot Stories — posted NON-ANONYMOUSLY.
--     Disable trg_story_author (it forces author_id := auth.uid(), which is NULL
--     in the SQL editor) so we can set the real author + name ourselves.
--     Idempotent: clear this batch (and bot-given umbrellas) first.
-- ============================================================
delete from umbrellas u using profiles p where u.user_id = p.id and p.is_bot;  -- clear prior bot umbrellas
delete from stories where seed_batch = 3;                                       -- clear prior bot posts

alter table stories disable trigger trg_story_author;

insert into stories (author_id, author_name, anonymous, text, intent, category,
                     content_warning, umbrella_count, state, seed, seed_batch, created_at)
select
  u.id,
  bp.username,                      -- name shows → NOT anonymous
  false,                            -- explicitly un-anonymous
  bp.text, bp.intent, bp.category, bp.cw,
  0,                                -- real umbrella rows (Part D) drive the count
  'live', true, 3,
  -- posted at some point between signup and now
  (now() - (b.signup_days_ago || ' days')::interval)
    + random() * (now() - (now() - (b.signup_days_ago || ' days')::interval))
from _bot_posts bp
join _bots b       on b.username = bp.username
join auth.users u  on u.email   = b.email;

alter table stories enable trigger trg_story_author;

-- ============================================================
--  D) Bots open umbrellas — REAL rows in the umbrellas table.
--     Each bot umbrellas a random spread of OTHER people's live posts (bot posts
--     + the existing anonymous seed posts). Never their own (trg_no_self_umbrella),
--     never a dup (unique story_id,user_id).
--     Triggers then bump: stories.umbrella_count, profiles.umbrellas_sent.
--     created_at spread over the last 10 days so some land TODAY → they also
--     show up in community_pulse.umbrellas_today.
-- ============================================================
insert into umbrellas (story_id, user_id, created_at)
select s.id, botp.id,
       greatest(s.created_at, now() - interval '10 days')
         + random() * (now() - greatest(s.created_at, now() - interval '10 days'))
from (select p.id from profiles p where p.is_bot) botp
cross join lateral (
  select s.id, s.created_at
  from stories s
  where s.state = 'live'
    and (s.author_id is null or s.author_id <> botp.id)   -- never self-umbrella
  order by random()
  limit (14 + floor(random() * 24)::int)                  -- each bot: ~14–37 umbrellas
) s
on conflict (story_id, user_id) do nothing;

-- ============================================================
--  E) Keep the invariant: an umbrella is a hug → hug_count = umbrella_count
-- ============================================================
update stories set hug_count = umbrella_count where hug_count is distinct from umbrella_count;

-- ============================================================
--  F) Register bots as ACTIVE users too (only if user_activity exists).
--     Mirrors analytics_active_and_registrations.sql's backfill for bot rows.
-- ============================================================
do $$
begin
  if to_regclass('public.user_activity') is not null then
    insert into user_activity (user_id, day)
      select author_id, (created_at at time zone 'America/Vancouver')::date
      from stories where seed_batch = 3 and author_id is not null
    on conflict do nothing;
    insert into user_activity (user_id, day)
      select u.user_id, (u.created_at at time zone 'America/Vancouver')::date
      from umbrellas u join profiles p on p.id = u.user_id where p.is_bot
    on conflict do nothing;
  end if;
end $$;

-- ============================================================
--  0b) MEASUREMENT: per-bot metrics view (for the assignment)
--      Everything here is backed by real rows, so it agrees with the site.
-- ============================================================
create or replace view bot_metrics as
select
  p.id,
  p.username,
  p.display_name,
  p.created_at                                                              as joined_at,
  coalesce((select count(*) from stories s
              where s.author_id = p.id and s.state = 'live'), 0)            as posts,
  coalesce((select count(*) from umbrellas u where u.user_id = p.id), 0)    as umbrellas_given,
  coalesce((select sum(s.umbrella_count) from stories s
              where s.author_id = p.id), 0)                                 as umbrellas_received
from profiles p
where p.is_bot
order by p.created_at;
grant select on bot_metrics to authenticated;

drop table if exists _bots;
drop table if exists _bot_posts;

-- ============================================================
--  VERIFY — confirm the seed landed and every count is real-row-backed
-- ============================================================
select 'bots'                as metric, count(*)::bigint as value from profiles where is_bot
union all
select 'bot posts',            count(*)          from stories   where seed_batch = 3
union all
select 'bot posts (non-anon)', count(*)          from stories   where seed_batch = 3 and anonymous = false and author_name is not null
union all
select 'umbrella ROWS by bots',count(*)          from umbrellas u join profiles p on p.id=u.user_id where p.is_bot
union all
select 'community_umbrellas()',community_umbrellas()
union all
select 'umbrellas_today (pulse)', (select umbrellas_today from community_pulse());

-- Per-bot breakdown:
select * from bot_metrics;
