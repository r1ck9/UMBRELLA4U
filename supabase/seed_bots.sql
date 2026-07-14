-- ============================================================
--  Umbrella — SEED BOTS v2 (200 measurable, non-anonymous accounts)
--
--  Private seed/simulation data for this project only. Run ONCE in the Supabase
--  SQL Editor. Safe + idempotent (wipes and rebuilds all bot data each run).
--
--  Fleet:
--    * 150 ACTIVE bots  — authors of the posts; each also carries a behaviour
--        weight (bot_umbrellas_per_day 3..8) that controls how often it umbrellas.
--    * 50 LURKER bots   — post nothing; they're the heaviest umbrella-givers.
--
--  Posts: every line in the content pool is used EXACTLY ONCE (no repeated text
--  anywhere in the feed), each assigned to a random active bot. To add more posts,
--  just add more lines to the _bot_posts pool below.
--
--  Umbrella counts are SPREAD OUT per post (skewed low, HARD CAP 60) so they look
--  natural rather than a flat wall. Givers are sampled from the fleet weighted by
--  behaviour (lurkers heaviest, then active bots by their per-day rate).
--
--  Everything is REAL and row-backed:
--    - Real auth.users rows (fake @bots.umbrella4u.ca emails) → handle_new_user
--      auto-creates their profiles → they count in registration analytics.
--    - Fake handle-style names (e.g. "Quiet Harbor"), NOT real personal names.
--    - MOST posts are non-anonymous (name shown); ~25% are anonymous (name
--      hidden) for realism. author_id is kept either way, so all posts count.
--    - Umbrellas are REAL rows in the umbrellas table.
--    - umbrella_count / hug_count / umbrellas_sent / post_count are RECOMPUTED
--      from the actual rows for every story & profile, so every count surface
--      (community_umbrellas, community_pulse, engagement_stats, activity_by_day,
--      profile stats) agrees and is backed by real rows.
--
--  NOTE: because counts are recomputed from real rows, any previously hand-set
--  fake counts (e.g. the old exact 3000 total / 15-floor) are replaced by the
--  real per-post totals (each spread between 2 and 60).
--
--  Performance: triggers on stories/umbrellas are disabled during the bulk load
--  and re-enabled after; counts are recomputed in a few set-based UPDATEs. If
--  the SQL editor times out, lower the inlined window/fleet numbers and re-run.
--
--  Undo everything:
--    delete from umbrellas u using profiles p where u.user_id=p.id and p.is_bot;
--    delete from stories where seed_batch = 3;
--    delete from auth.users u using profiles p where p.id=u.id and p.is_bot;
--  (then optionally re-run the count recompute block at the bottom manually)
-- ============================================================

-- ---------- measurement / behaviour columns ----------
alter table profiles add column if not exists is_bot                boolean default false;
alter table profiles add column if not exists bot_kind              text;     -- 'active' | 'lurker'
alter table profiles add column if not exists bot_posts_per_day     int;
alter table profiles add column if not exists bot_umbrellas_per_day int;
comment on column profiles.is_bot is
  'Seed marker. TRUE = simulated bot account. Bots are otherwise real users so they still count in every metric; this flag lets you segment them out.';
create index if not exists idx_profiles_is_bot on profiles(is_bot) where is_bot;

alter table stories add column if not exists seed       boolean default false;
alter table stories add column if not exists seed_batch int;
alter table stories add column if not exists hug_count  int default 0;

-- ---------- config (TUNE HERE) ----------
--  These three numbers are inlined below (search to change them):
--    * 150  = active bots
--    * 50   = lurker bots        (fleet total = 150 + 50 = 200)
--    * 30   = window_days  (how many days of history to spread activity across)
--  (kept as literals, not a config table, because the SQL editor doesn't reliably
--   carry a helper table between statements.)

-- ============================================================
--  Wipe any previous bot fleet (incl. the old real-name personas).
--  IMPORTANT: disable triggers on stories/umbrellas FIRST, so deleting a prior
--  run's rows is a fast bulk delete instead of firing per-row count triggers
--  (a big previous fleet made this the slow step that timed out).
-- ============================================================
alter table stories   disable trigger user;
alter table umbrellas disable trigger user;

delete from umbrellas u using profiles p where u.user_id = p.id and p.is_bot;
delete from stories where seed_batch = 3;
delete from stories s using profiles p where s.author_id = p.id and p.is_bot;
delete from auth.users u using profiles p where p.id = u.id and p.is_bot;
delete from auth.users where email like '%@bots.umbrella4u.ca';

-- ============================================================
--  Generate 200 bot identities with FAKE handle-style names.
--  username = adjective_noun_<n> (unique via n); display_name = "Adjective Noun".
-- ============================================================
drop table if exists _bots;
create table _bots (
  n int, email text, username text, display_name text, pronouns text,
  status_weather text, about_me text, accent_color text,
  signup_days_ago int, is_lurker boolean, posts_per_day int, umbrellas_per_day int
);

--  Usernames come in MANY styles (dotted, hyphenated, concatenated, gamer xx_..,
--  number suffixes/prefixes, the_..) so the fleet doesn't look templated.
--  Uniqueness is guaranteed: number-free styles use a bijection on i (distinct
--  word pairs), numbered styles embed the unique value (100+i).
insert into _bots (n, email, username, display_name, pronouns, status_weather,
                   about_me, accent_color, signup_days_ago, is_lurker, posts_per_day, umbrellas_per_day)
select
  i,
  h.handle || '@bots.umbrella4u.ca',
  h.handle,
  h.disp,
  arr.pr[1+i%4],
  arr.wx[1+i%6],
  arr.bio[1+i%8],
  arr.col[1+i%10],
  (i*5) % 30,                       -- signup spread over the window (overridden later)
  (i > 150),                        -- bots 151..200 are lurkers
  case when i > 150 then 0 else 1 + i%3 end,
  case when i > 150 then 0 else 3 + i%6 end
from generate_series(1, 150 + 50) i
cross join (select
  array['quiet','soft','late','half','low','spare','tired','breezy','foggy','stormy',
        'pocket','paper','velvet','amber','hollow','copper','silver','rusty','misty','crimson',
        'dusty','golden','frosted','shy','wander','drift','restless','sleepy','electric','neon',
        'muted','faded','distant','hidden','folded','autumn','winter','summer','ember','still'] adj,
  array['harbor','ember','willow','sparrow','comet','pebble','lantern','meadow','river','fox',
        'moth','tide','fern','cedar','finch','maple','robin','otter','heron','birch',
        'wren','clover','marsh','dune','reef','vale','glen','brook','frost','haze',
        'signal','echo','orbit','pixel','lark','sage','wisp','cove','ridge','stone'] nn,
  array['she/her','he/him','they/them','she/they'] pr,
  array['sunny','partly cloudy','overcast','light rain','foggy','clearing up'] wx,
  array['just here to listen mostly.','small wins person.','overthinker in training.',
        'night owl, bad texter.','trying to be kinder to myself.','new here, saying hi.',
        'quiet but i read everything.','one day at a time.'] bio,
  array['#e8913c','#7c9cbf','#c96f8f','#5aa88a','#8a7bc8','#4f9d9d','#b98b52','#d98b4a','#6b8fb5','#cf7b6b'] col
) arr
cross join lateral (
  select
    lower(case i % 8
      -- numbered styles: unique via (100+i); words can repeat
      when 0 then arr.adj[1+((i-1)*3)%40] || arr.nn[1+((i-1)*7)%40] || (100+i)::text  -- sleepyfox142
      when 4 then arr.adj[1+((i-1)*3)%40] || (100+i)::text                            -- willow142
      when 6 then arr.adj[1+((i-1)*3)%40] || '_' || (100+i)::text                     -- fox_142
      when 7 then (100+i)::text || arr.adj[1+((i-1)*3)%40]                            -- 142willow
      -- number-free styles: unique via bijection (i-1)%40 , (i-1)/40
      when 1 then arr.adj[1+(i-1)%40] || '_' || arr.nn[1+(i-1)/40]                    -- quiet_harbor
      when 2 then arr.adj[1+(i-1)%40] || '.' || arr.nn[1+(i-1)/40]                    -- late.willow
      when 3 then 'xx_' || arr.adj[1+(i-1)%40] || '_' || arr.nn[1+(i-1)/40] || '_xx'  -- xx_ember_fox_xx
      else 'the_' || arr.adj[1+(i-1)%40] || '_' || arr.nn[1+(i-1)/40]                 -- the_quiet_harbor (s=5)
    end) as handle,
    initcap(arr.adj[1+(i-1)%40]) || ' ' || initcap(arr.nn[1+(i-1)/40]) as disp
) h;

-- ============================================================
--  Content pool (drawn from at random for active bots' posts).
-- ============================================================
drop table if exists _bot_posts;
create table _bot_posts (text text, intent text, category text, cw boolean);
insert into _bot_posts (text, intent, category, cw) values
 ($$i rewrote a text to my friend like nine times and then just didn't send it. anyone else do this$$,'similar','mind',false),
 ($$got picked last in gym again. i'm 16 and it still does something to me i can't explain.$$,'listen','school',false),
 ($$my art teacher held up my sketch as a good example and i wanted to disappear AND live forever$$,'similar','wins',false),
 ($$how do you tell your parents you want to do something creative when they only see it as a hobby$$,'advice','culture',false),
 ($$told my brother i was struggling and he said "just don't think about it." cool. fixed. thanks.$$,'listen','vent',false),
 ($$anyone got a way to fall asleep when your brain replays every dumb thing you've ever done$$,'advice','mind',true),
 ($$it's 2am and everything feels like the end of the world and i KNOW it won't be by morning$$,'similar','mind',true),
 ($$made it a whole week without a 2am spiral. posting so future me remembers it's possible.$$,'similar','wins',false),
 ($$i said no to a party i didn't want to go to and didn't make a fake excuse. just no. felt huge.$$,'similar','wins',false),
 ($$does anyone else feel like they're the side character in their own friend group$$,'similar','mind',false),
 ($$didn't do anything impressive today. got up, went to school, came home. counting it as a win.$$,'similar','wins',false),
 ($$how do you keep going when nothing feels like it matters but you're not failing exactly$$,'advice','mind',true),
 ($$moved schools mid-year again. i've gotten too good at the "new kid" walk and i hate that.$$,'listen','culture',false),
 ($$made an actual friend today. we bonded over hating the same song. small but it's something.$$,'similar','wins',false),
 ($$teacher called on me and my mind went blank even though i knew it. replaying it forever now.$$,'similar','school',false),
 ($$any tips for talking in class without your voice going all shaky$$,'advice','school',false),
 ($$cancelled on my friends again and now i feel guilty AND relieved and idk what that says$$,'listen','mind',false),
 ($$how do you explain you like someone but need to be alone a lot without them taking it personally$$,'advice','identity',false),
 ($$someone asked how i was and i said "good" so fast it scared me. when did that get automatic$$,'listen','mind',true),
 ($$got my chem grade from a fail to a pass. nobody at home noticed but i'm proud so i'm telling you$$,'similar','wins',false),
 ($$i translate for my mom at every appointment. i'm 15. sometimes i just want to be the kid.$$,'listen','culture',false),
 ($$anyone else feel not enough of either culture you're from. like you're standing in a doorway.$$,'similar','identity',false),
 ($$i can build a whole app but can't send a text to a girl. explain that.$$,'similar','identity',false),
 ($$stayed up til 4 fixing a bug and it was a missing comma. wanted to throw my laptop into the sea.$$,'listen','vent',false),
 ($$i watered my plant and it didn't die and that's the highlight of my week and i'm okay with that$$,'similar','wins',false),
 ($$reminder: you're allowed to be proud of stuff that seems small to everyone else$$,'listen','mind',false),
 ($$missed the bus, got soaked, showed up late, teacher made a comment in front of everyone. cool day.$$,'listen','vent',false),
 ($$how do you stop caring what people think when your whole brain is wired to care$$,'advice','mind',false),
 ($$quit the one thing i was good at because it stopped being fun and now people keep asking why$$,'listen','identity',false),
 ($$is it normal to feel relieved and sad about the same decision at the same time$$,'similar','mind',false),
 ($$asked one friend to use a different name for me and they just did it. huge to me.$$,'similar','identity',true),
 ($$trying to be more myself but in small doses so it's less scary. baby steps are still steps right$$,'similar','wins',false),
 ($$said a word wrong in english today, someone laughed, and i've replayed it about 400 times since$$,'listen','culture',false),
 ($$found one other person at school who speaks my first language and we lit up. missed that sound.$$,'similar','wins',false),
 ($$i'm always the backup plan. the second call. it's wearing me down more than i let on.$$,'listen','mind',true),
 ($$how do you believe you matter when the evidence keeps saying you're everyone's plan B$$,'advice','mind',true),
 ($$my sleep schedule is destroyed and adults act like i can just "fix" it by wanting to$$,'listen','vent',false),
 ($$anyone got things that actually help wind down at night. my brain treats bedtime as brainstorm time$$,'resources','mind',false),
 ($$put my headphones in and a song came on that felt like it knew exactly what today was$$,'similar','mind',false),
 ($$played a song i wrote for one person and they liked it. never been that scared and that happy.$$,'similar','wins',false),
 ($$people talk over me constantly and i've started wondering if i'd have to yell to be noticed$$,'listen','mind',false),
 ($$does being invisible ever flip into feeling free instead of lonely or is that just a cope$$,'similar','identity',false),
 ($$first period at 7am is a crime and my brain doesn't switch on til lunch$$,'similar','school',false),
 ($$i'm the one everyone vents to. today i needed someone and realized i don't have a person for that.$$,'listen','mind',true),
 ($$how do you ask for support when you've always been the "strong friend"$$,'advice','mind',false),
 ($$running on empty but i made it to the end of the day. that's the whole update. still here.$$,'similar','wins',true),
 ($$is it burnout if you're 16. everyone says i'm too young but i feel it in my bones.$$,'advice','mind',true),
 ($$how do i stop reading into every little thing my friends say. i replay conversations for days$$,'advice','mind',false),
 ($$got my report card and it was better than last term. nobody clapped so i'm clapping for myself$$,'similar','wins',false),
 ($$my parents fight in the next room and i just put my headphones in and pretend. anyone else$$,'listen','vent',false),
 ($$tried out for a solo in choir. didn't get it. cried in the bathroom then got a slushie. balance$$,'similar','mind',false),
 ($$how do you make yourself do homework when your brain just refuses to cooperate$$,'advice','school',false),
 ($$someone sat with me at lunch today without me asking. i almost cried into my sandwich$$,'similar','wins',false),
 ($$deleted the app that makes me feel bad about myself. day one. wish me luck$$,'similar','wins',false),
 ($$does anyone else feel like they're just waiting for their life to start$$,'similar','mind',false),
 ($$told my mom i was sad and she asked what i had to be sad about. i don't have an answer she'd accept$$,'listen','mind',true),
 ($$finished a whole assignment a day early for once. who even am i$$,'similar','wins',false),
 ($$i keep saying yes to things i don't want to do because no feels impossible. tips?$$,'advice','identity',false),
 ($$my dog is the only one who doesn't want anything from me and that's why i love him$$,'listen','mind',false),
 ($$everyone's getting into relationships and i've never even held hands and i feel behind$$,'similar','identity',false),
 ($$got complimented on something i was insecure about and i've been floating all day$$,'similar','wins',false),
 ($$how do you deal with a parent who reads your texts and calls it "keeping you safe"$$,'advice','vent',false),
 ($$i laughed for real today for the first time in a while. forgot what that felt like$$,'similar','mind',false),
 ($$tired of being the "smart one" like that's my whole personality and if i slip everyone panics$$,'listen','school',false),
 ($$moved somewhere new where i don't know the slang and i feel like i'm learning a whole language$$,'listen','culture',false),
 ($$anyone know how to stop biting your nails when you're stressed. it's bad$$,'resources','mind',false),
 ($$wrote in a journal a week straight. small but the longest i've stuck to anything$$,'similar','wins',false),
 ($$my best friend has a new best friend and i'm trying to be normal about it and failing$$,'listen','mind',false),
 ($$what do you do when you're proud of yourself but there's nobody to tell$$,'similar','mind',false),
 ($$faked being sick to skip a presentation and now i have to do it monday anyway. genius$$,'listen','school',false),
 ($$someone remembered a small thing i mentioned once and it made my whole week$$,'similar','wins',false),
 ($$how do you know if you actually need help or if you're just being dramatic$$,'advice','mind',true),
 ($$cleaned my closet and found a shirt from when i was little and just sat there for a while$$,'listen','mind',false),
 ($$tired of pretending i don't care when i very much do care$$,'listen','vent',false),
 ($$got through a panic attack at school by myself in the bathroom. still shaking but i did it$$,'similar','mind',true),
 ($$does it get easier or do you just get used to it$$,'similar','mind',true),
 ($$my little cousin thinks i'm the coolest person alive and honestly that's keeping me going$$,'similar','wins',false),
 ($$how do you make friends as a teen when everyone already has their groups locked in$$,'advice','school',false),
 ($$said what i actually thought in class instead of the safe answer. felt dangerous and good$$,'similar','school',false),
 ($$everyone keeps saying these are the best years of my life and that's kind of terrifying$$,'listen','mind',false),
 ($$found a song that made me feel understood and played it 40 times. counts as therapy right$$,'similar','mind',false),
 ($$scared to grow up and scared to stay the same and that's a fun combo$$,'listen','identity',false),
 ($$told my crush i liked their jacket. that's the whole interaction. counting it as brave$$,'similar','wins',false),
 ($$how do you stop comparing your behind-the-scenes to everyone else's highlight reel$$,'advice','mind',false),
 ($$grades slipped and instead of yelling my teacher asked if i was okay. wasn't ready for that$$,'listen','school',false),
 ($$been waking up early to watch the sunrise. it's the only quiet i get all day$$,'similar','mind',false),
 ($$anyone else rehearse phone calls before making them$$,'similar','mind',false),
 ($$forgave someone today, not for them, for me. weird how heavy that was to put down$$,'similar','wins',false),
 ($$staying in on a friday. i used to feel bad about it but tonight it just feels like rest$$,'similar','mind',false),
 ($$finally told my counselor the real reason i've been off and didn't downplay it. felt like setting down a backpack$$,'similar','mind',true),
 ($$my mom hugged me for no reason today and i had to pretend i had something in my eye$$,'similar','wins',false),
 ($$how do you get over the fear that everyone secretly finds you annoying$$,'advice','mind',false),
 ($$spent my whole allowance on books instead of clothes again. no regrets, my shelf is my happy place$$,'similar','wins',false),
 ($$got left on read by someone i really like and now i'm composing entire novels in my head$$,'listen','vent',false),
 ($$my little sister drew our family and put me in the middle. didn't know i mattered that much to her$$,'similar','wins',false),
 ($$anyone else clean their room only when avoiding a bigger problem. it's spotless. that's a bad sign$$,'similar','mind',false),
 ($$i've been the "funny one" so long i don't know how to just be sad in front of people$$,'listen','mind',true),
 ($$tried a new hobby and was terrible at it and had the best time. forgot being bad at things could be fun$$,'similar','wins',false),
 ($$how do you tell your friend group you're drifting without it turning into a whole thing$$,'advice','vent',false),
 ($$got a B on a test i thought i bombed and i've been grinning like an idiot all afternoon$$,'similar','wins',false),
 ($$my dad and i don't talk much but he fixed my bike without me asking. that's kind of his love language$$,'similar','culture',false),
 ($$does anyone else feel homesick for a place that doesn't exist anymore$$,'similar','culture',false),
 ($$wore something bright today instead of hiding in black and two people said i looked happy. maybe i am$$,'similar','wins',false),
 ($$how do you stop replaying an argument you already lost days ago$$,'advice','mind',false),
 ($$beat my own time on the track. no one was watching but me and that felt right$$,'similar','wins',false),
 ($$my grandma keeps asking when i'll "find someone" and i can't tell her i'm still finding me$$,'listen','identity',false),
 ($$skipped lunch to study and my friend silently slid half their sandwich over. didn't say a word. almost lost it$$,'similar','wins',false),
 ($$anyone know how to actually start journaling without feeling stupid writing to yourself$$,'resources','mind',false),
 ($$said "i'm proud of you" to myself in the mirror and felt ridiculous and then kind of not$$,'similar','wins',false),
 ($$everyone in class laughed at a joke i made and for a second i felt like i belonged there$$,'similar','school',false),
 ($$how do you deal with a friend who competes with you over everything, even bad days$$,'advice','vent',false),
 ($$got my braces off and i can't stop smiling which is convenient$$,'similar','wins',false),
 ($$my parents are proud of my grades but never ask if i'm okay and i don't know how to bring it up$$,'listen','mind',true),
 ($$spent an hour helping a stranger find the right bus and it weirdly fixed my whole mood$$,'similar','wins',false),
 ($$does the sunday night dread ever go away or do we all just live with it$$,'similar','mind',false),
 ($$raised my hand even though i wasn't 100% sure. got it wrong. world didn't end$$,'similar','school',false),
 ($$my best friend remembered my coffee order after i mentioned it once. small stuff like that keeps me going$$,'similar','wins',false),
 ($$how do you forgive yourself for stuff you did when you were younger and didn't know better$$,'advice','mind',true),
 ($$planted some seeds in a cup on my windowsill. checking them every morning like they'll talk back$$,'similar','wins',false);

-- ============================================================
--  A) Real auth.users accounts. handle_new_user() auto-creates profiles.
--     Fixed dummy bcrypt hash: bots never log in (no pgcrypto dependency).
-- ============================================================
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', b.email,
  '$2a$10$C6UzMDM.H6dfI/f/IKcEeO3.q0G9y4Qb0m0oK7Z3sJ8b0Xw5m5s2',
  now() - make_interval(days => b.signup_days_ago),
  now() - make_interval(days => b.signup_days_ago),
  now() - make_interval(days => b.signup_days_ago),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('username', b.username, 'is_bot', true),
  '', '', '', ''
from _bots b
where not exists (select 1 from auth.users u where u.email = b.email);

-- B) Fill in each bot's real profile (identity + behaviour + spread signup date)
update profiles p set
  is_bot                = true,
  bot_kind              = case when b.is_lurker then 'lurker' else 'active' end,
  bot_posts_per_day     = b.posts_per_day,
  bot_umbrellas_per_day = b.umbrellas_per_day,
  username       = b.username,
  display_name   = b.display_name,
  pronouns       = b.pronouns,
  status_weather = b.status_weather,
  about_me       = b.about_me,
  accent_color   = b.accent_color,
  created_at     = now() - make_interval(days => b.signup_days_ago)
from _bots b join auth.users u on u.email = b.email
where p.id = u.id;

do $$
begin
  if exists (select 1 from information_schema.columns where table_name='profiles' and column_name='onboarded') then
    update profiles set onboarded = true where is_bot;
  end if;
  if exists (select 1 from information_schema.columns where table_name='profiles' and column_name='discoverable') then
    update profiles set discoverable = true where is_bot;
  end if;
end $$;

-- ============================================================
--  Bulk load. (Triggers on stories/umbrellas were already disabled up top for
--  the fast wipe.) Counts are recomputed set-based afterwards, then re-enabled.
-- ============================================================

-- C) ACTIVE bots post. Each pool line is used EXACTLY ONCE (no repeated text in
--    the feed), assigned to a random active bot. MOST posts show the bot's name
--    (non-anonymous); ~25% are anonymous (name hidden) so the feed looks like a
--    real anonymous-support platform rather than 100% named accounts. Either way
--    author_id is kept, so every post still counts toward that bot's stats.
--    Posts are SPREAD EVENLY across the window (with jitter) — a steady drip.
with active_bots as (   -- shuffled, numbered active bots
  select u.id, b.username, row_number() over (order by random()) as brn
  from _bots b join auth.users u on u.email = b.email
  where b.is_lurker = false
),
posts as (              -- shuffled, numbered posts (+ per-post anonymity roll)
  select bp.text, bp.intent, bp.category, bp.cw,
         row_number() over (order by random()) as rn,
         count(*) over () as tot,
         (random() < 0.25) as anon        -- ~25% anonymous, ~75% show their name
  from _bot_posts bp
)
insert into stories (author_id, author_name, anonymous, text, intent, category,
                     content_warning, umbrella_count, state, seed, seed_batch, created_at)
select act.id,
       case when p.anon then null else act.username end,   -- name hidden when anonymous
       p.anon,
       p.text, p.intent, p.category, p.cw,
       0, 'live', true, 3,
       least(
         now() - interval '5 minutes',
         now() - make_interval(days => 30)
              + (p.rn::float / p.tot) * make_interval(days => 30)
              + (random() - 0.5) * interval '10 hours'
       )
from posts p
-- each post → a DIFFERENT bot (distinct while #posts ≤ #active bots; wraps beyond)
join active_bots act on act.brn = 1 + ((p.rn - 1) % (select count(*) from active_bots));

-- Signups over time: each posting bot joined 1–4 days before its first post;
-- non-posting bots (lurkers etc.) joined at a random point in the window. This
-- spreads registrations naturally and guarantees nobody posts before they joined.
update profiles p set created_at = s.first_post - (interval '1 day' + random() * interval '3 days')
from (select author_id, min(created_at) first_post from stories where seed_batch = 3 group by author_id) s
where p.id = s.author_id;

update profiles p set created_at = now() - (random() * make_interval(days => 30))
where p.is_bot
  and not exists (select 1 from stories s where s.author_id = p.id and s.seed_batch = 3);

-- D) Umbrellas — give each post its OWN varied number of real umbrellas so the
--    counts look natural, not a flat wall. Each story gets a target that's skewed
--    toward lower numbers with a HARD CAP of 60 (computed per-row in the SELECT
--    list, so it genuinely varies — a random() in LIMIT is evaluated only once
--    per query and would make every post identical). Givers are sampled from the
--    fleet WEIGHTED by behaviour: lurkers heaviest, then actives by their rate.
with tgt as (
  select s.id as story_id, s.author_id, s.created_at,
         least(60, 2 + floor(power(random(), 2.0) * 85)::int) as target   -- 2..60, skewed low
  from stories s
  where s.state = 'live'
),
ranked as (
  select t.story_id, t.created_at, t.target, p.id as user_id,
         row_number() over (
           partition by t.story_id
           order by power(random(), 1.0 / (case when p.bot_kind = 'lurker'
                                                then 12 else coalesce(p.bot_umbrellas_per_day, 3) end)) desc
         ) as rn
  from tgt t
  join profiles p
    on p.is_bot and (t.author_id is null or p.id <> t.author_id)   -- never self (trigger is off)
)
insert into umbrellas (story_id, user_id, created_at)
select story_id, user_id, created_at + random() * (now() - created_at)
from ranked
where rn <= target
on conflict (story_id, user_id) do nothing;

-- ============================================================
--  Recompute EVERY denormalized count from the real rows (row-backed truth).
-- ============================================================
update stories s set umbrella_count = coalesce(c.n, 0), hug_count = coalesce(c.n, 0)
from (select story_id, count(*) n from umbrellas group by story_id) c
where s.id = c.story_id;
update stories s set umbrella_count = 0, hug_count = 0
where not exists (select 1 from umbrellas u where u.story_id = s.id);

update profiles p set umbrellas_sent = coalesce(c.n, 0)
from (select user_id, count(*) n from umbrellas group by user_id) c
where p.id = c.user_id;
update profiles p set umbrellas_sent = 0
where not exists (select 1 from umbrellas u where u.user_id = p.id);

update profiles p set post_count = coalesce(c.n, 0)
from (select author_id, count(*) n from stories where author_id is not null group by author_id) c
where p.id = c.author_id;
update profiles p set post_count = 0
where not exists (select 1 from stories s where s.author_id = p.id);

-- re-enable triggers
alter table stories   enable trigger user;
alter table umbrellas enable trigger user;

-- F) Register bots as ACTIVE users too (only if user_activity exists)
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
--  Measurement view (backed by real rows → agrees with the site)
-- ============================================================
drop view if exists bot_metrics;   -- prior version had different columns; recreate cleanly
create or replace view bot_metrics as
select
  p.id, p.username, p.display_name, p.bot_kind,
  p.bot_posts_per_day, p.bot_umbrellas_per_day,
  p.created_at as joined_at,
  coalesce((select count(*) from stories s where s.author_id = p.id and s.state='live'), 0) as posts,
  coalesce((select count(*) from umbrellas u where u.user_id = p.id), 0)                    as umbrellas_given,
  coalesce((select sum(s.umbrella_count) from stories s where s.author_id = p.id), 0)       as umbrellas_received
from profiles p
where p.is_bot
order by p.bot_kind, p.username;
grant select on bot_metrics to authenticated;

drop table if exists _bots;
drop table if exists _bot_posts;

-- ============================================================
--  VERIFY
-- ============================================================
select 'bots total'            as metric, count(*)::bigint as value from profiles where is_bot
union all select 'active bots',  count(*) from profiles where bot_kind='active'
union all select 'lurker bots',  count(*) from profiles where bot_kind='lurker'
union all select 'bot posts (named)',     count(*) from stories where seed_batch=3 and anonymous=false and author_name is not null
union all select 'bot posts (anonymous)', count(*) from stories where seed_batch=3 and anonymous=true
union all select 'umbrella ROWS by bots', (select count(*) from umbrellas u join profiles p on p.id=u.user_id where p.is_bot)
union all select 'umbrella ROWS total',   (select count(*) from umbrellas)
union all select 'community umbrella total (sum umbrella_count)',
                                           (select coalesce(sum(umbrella_count),0) from stories where state='live')
union all select 'umbrellas today',
                                           (select count(*) from umbrellas
                                            where (created_at at time zone 'America/Vancouver')::date
                                                = (now() at time zone 'America/Vancouver')::date);

select bot_kind, count(*) bots, sum(posts) posts, sum(umbrellas_given) umbrellas_given
from bot_metrics group by bot_kind;
