-- ============================================================
--  UMBRELLA4U — SECURITY BUNDLE. Run this whole file ONCE in the Supabase
--  SQL Editor. Safe to re-run. Fixes, in order:
--    1. Moderator takeover (profiles privilege escalation)
--    2. Hide bots: lock profiles + stories columns so is_bot / seed markers
--       are NOT readable via the API
--    3. bot_metrics view no longer API-reachable
--    4. push_config secret not API-readable
--    5. stories insert can't forge counts/state/seed
--
--  ⚠️ In section 1, replace REPLACE_WITH_YOUR_REAL_MOD_USERNAMES first.
-- ============================================================


-- ============================================================
-- 1) MODERATOR TAKEOVER FIX
--    Root cause: "manage own profile" was FOR ALL with no column limit, so a
--    user could PATCH is_moderator=true on their own row via the REST API.
-- ============================================================

-- Audit: who has power right now? Make sure this is only people you trust.
select id, username, is_moderator, coalesce(is_bot,false) as is_bot
from profiles where is_moderator or is_bot order by is_moderator desc;

-- Trigger: hard-block privilege flags from the browser roles (belt + suspenders
-- with the column grants in section 2).
create or replace function protect_privileged_profile_cols() returns trigger
language plpgsql as $$
begin
  if session_user in ('authenticated','anon') then
    if new.is_moderator is distinct from old.is_moderator
       or coalesce(new.is_bot,false) is distinct from coalesce(old.is_bot,false) then
      raise exception using message = 'cannot_modify_privileged_columns';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_protect_profile on profiles;
create trigger trg_protect_profile before update on profiles
  for each row execute function protect_privileged_profile_cols();

-- Remediate: reset anyone who shouldn't be a moderator.
-- >>> REPLACE the username list with your REAL moderators before running <<<
update profiles set is_moderator = false
where is_moderator = true
  and username not in ('REPLACE_WITH_YOUR_REAL_MOD_USERNAMES');


-- ============================================================
-- 2) HIDE THE BOTS — column-level SELECT/UPDATE grants.
--    profiles is publicly readable, so is_bot / bot_* would let anyone list
--    every bot via the API. Grant access ONLY to the safe columns.
-- ============================================================

-- profiles: readable columns (everything EXCEPT is_bot, bot_kind,
-- bot_posts_per_day, bot_umbrellas_per_day).
revoke select, update on table profiles from anon, authenticated;
grant select (
  id, username, display_name, pronouns, status_weather, about_me,
  accent_color, avatar_url, banner_url, banner_theme, tags,
  discoverable, notify_email, onboarded, post_count, streak_count,
  umbrellas_sent, is_moderator, last_active_date, last_notified_at,
  last_reengaged_at, created_at
) on table profiles to anon, authenticated;
-- writable columns (safe profile fields only — never is_moderator / is_bot).
grant update (
  username, display_name, pronouns, status_weather, about_me,
  accent_color, avatar_url, banner_url, banner_theme, tags,
  onboarded, discoverable, notify_email
) on table profiles to authenticated;

-- stories: readable columns (everything EXCEPT seed, seed_batch,
-- umbrella_target — the seeding/drip markers).
revoke select, insert on table stories from anon, authenticated;
grant select (
  id, author_id, author_name, anonymous, text, intent, category,
  content_warning, umbrella_count, state, created_at, boost_count,
  hug_count, off_topic_count, prompt_id, view_count, weather, channel_id
) on table stories to anon, authenticated;
-- insertable columns (the app sets these; counts/state/seed keep safe defaults).
grant insert (
  text, intent, category, anonymous, weather, prompt_id, channel_id, content_warning
) on table stories to authenticated;


-- ============================================================
-- 3) bot_metrics view — not API-reachable.
-- ============================================================
create or replace view bot_metrics with (security_invoker = on) as
select p.id, p.username, p.display_name, p.bot_kind,
       p.bot_posts_per_day, p.bot_umbrellas_per_day, p.created_at as joined_at,
       coalesce((select count(*) from stories s where s.author_id=p.id and s.state='live'),0) as posts,
       coalesce((select count(*) from umbrellas u where u.user_id=p.id),0) as umbrellas_given,
       coalesce((select sum(s.umbrella_count) from stories s where s.author_id=p.id),0) as umbrellas_received
from profiles p where p.is_bot order by p.bot_kind, p.username;
revoke all on bot_metrics from anon, authenticated;


-- ============================================================
-- 4) push_config secret — server-only (skip if you haven't run web_push.sql).
-- ============================================================
do $$ begin
  if to_regclass('public.push_config') is not null then
    execute 'alter table push_config enable row level security';
    execute 'revoke all on table push_config from anon, authenticated';
  end if;
end $$;


-- Done. Verify (as owner, here in the SQL editor) that bots still exist:
select count(*) as bots from profiles where is_bot;
