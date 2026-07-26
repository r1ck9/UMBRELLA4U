-- ============================================================
--  SECURITY HARDENING — follow-up to security_fix_privesc.sql.
--  Run once in the Supabase SQL Editor. Safe to re-run.
--
--  Full RLS sweep found two more issues (lower severity than the moderator
--  takeover, but same class — the public API is the real attack surface):
--
--   A) push_config has NO row-level security. It holds the push SECRET, so once
--      web_push.sql is run, any visitor could read it via the REST API and forge
--      push notifications to any user. Fix: enable RLS with NO policy → only
--      SECURITY DEFINER functions / the service role can read it.
--
--   B) stories INSERT has no column restriction. The set_story_author trigger
--      forces author_id, but a crafted API insert could still set
--      umbrella_count / boost_count / state / seed to manipulate feed ranking
--      or hide from analytics. Fix: grant INSERT on only the columns the app
--      actually sets; counts/state/seed fall back to their safe defaults.
-- ============================================================

-- A) push_config: server-only.
alter table if exists push_config enable row level security;
-- (no policy on purpose — the notify trigger reads it as a SECURITY DEFINER
--  function, which bypasses RLS; the browser roles get nothing.)
revoke all on table push_config from anon, authenticated;

-- B) stories: only these columns are user-settable on insert.
revoke insert on table stories from anon, authenticated;
grant insert (text, intent, category, anonymous, weather, prompt_id, channel_id, content_warning)
  on table stories to authenticated;
-- author_id / author_name are set by the trigger; umbrella_count, boost_count,
-- hug_count, view_count, off_topic_count, state, seed, seed_batch keep their
-- table defaults and can no longer be forged from the client.

-- Note: bots and seed content are inserted via the service_role / SECURITY
-- DEFINER functions, which run as the table owner and bypass these grants —
-- so seeding, the drip engine, and moderation are unaffected.
