-- ============================================================
--  SECURITY FIX — profile privilege escalation (moderator takeover).
--  Run once in the Supabase SQL Editor. Do the AUDIT first, then the rest.
--
--  ROOT CAUSE: the "manage own profile" policy is FOR ALL with no column
--  limit, so any signed-in user could UPDATE any column of their OWN profiles
--  row through the Supabase REST API — including is_moderator — and make
--  themselves a moderator straight from the browser network tab.
--
--  FIX: restrict WHICH columns authenticated users may update. RLS still keeps
--  them to their own row; column grants stop them writing privileged fields.
--  Triggers, SECURITY DEFINER functions, and the service_role run as the table
--  owner and are UNAFFECTED — so streaks/counts/onboarding still work and you
--  can still grant real moderators here in the SQL editor.
-- ============================================================

-- 1) AUDIT — who has power right now? Eyeball this and make sure it's only people you trust.
select id, username, is_moderator, coalesce(is_bot, false) as is_bot
from profiles
where is_moderator = true or is_bot = true
order by is_moderator desc, is_bot desc;

-- 2) LOCK DOWN — logged-in users may update ONLY these safe profile fields.
revoke update on table profiles from anon, authenticated;
grant update (
  username, display_name, pronouns, status_weather, about_me,
  accent_color, avatar_url, banner_url, banner_theme, tags,
  onboarded, discoverable, notify_email
) on table profiles to authenticated;
-- Everything else (is_moderator, is_bot, bot_*, streak_count, post_count,
-- umbrellas_sent, last_*, id) is now NOT user-writable via the API.

-- 3) SECOND LAYER — a trigger that hard-blocks privilege flags from the API
--    even if the grants above are ever loosened by mistake. (session_user is
--    'authenticated'/'anon' for API calls, 'postgres' in this SQL editor.)
create or replace function protect_privileged_profile_cols() returns trigger
language plpgsql as $$
begin
  if session_user in ('authenticated', 'anon') then
    if new.is_moderator is distinct from old.is_moderator
       or coalesce(new.is_bot, false) is distinct from coalesce(old.is_bot, false) then
      raise exception using message = 'cannot_modify_privileged_columns';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_protect_profile on profiles;
create trigger trg_protect_profile before update on profiles
  for each row execute function protect_privileged_profile_cols();

-- 4) REMEDIATE — reset anyone who shouldn't be a moderator.
--    Replace the list with your REAL moderator usernames, then run.
update profiles set is_moderator = false
where is_moderator = true
  and username not in ('REPLACE_WITH_YOUR_REAL_MOD_USERNAMES');

-- To intentionally grant a moderator later, run this HERE in the SQL editor
-- (it executes as the table owner, so the trigger + grants don't block it):
--   update profiles set is_moderator = true where username = 'someone';
