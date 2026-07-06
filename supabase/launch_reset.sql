-- LAUNCH RESET — run once in Supabase SQL Editor. Wipes all test data + accounts.
-- ⚠️ This deletes ALL posts and ALL signed-up users. Only run before launch / for a clean slate.

-- 1) wipe all test content
delete from umbrellas;
delete from reports;
delete from stories;

-- 2) wipe all signed-up accounts (so you can test the email-confirmation flow fresh)
delete from auth.users;   -- cascades to profiles

-- 3) set the daily umbrella limit to 5
create or replace function enforce_daily_umbrella_limit()
returns trigger language plpgsql as $$
declare cnt int;
begin
  select count(*) into cnt from umbrellas
  where user_id = auth.uid() and created_at >= date_trunc('day', now());
  if cnt >= 5 then
    raise exception using message = 'daily_umbrella_limit';
  end if;
  return new;
end $$;
