-- ============================================================
--  HIDE is_moderator / is_bot FROM THE PUBLIC API
--  The last open finding: anyone with the public key can list your moderators.
--
--  The earlier script refused to do this because rules mention those columns.
--  That caution was unnecessary: Postgres checks column permissions against the
--  columns a QUERY asks for, not against columns used inside a security rule or
--  a security-definer function. So the rules keep working.
--
--  This runs as one transaction and tests itself before committing. It becomes
--  the app's roles, runs the real queries the site makes, and insists they work.
--  If any of them fail, NOTHING is applied.
--  Safe to re-run. Deletes nothing.
-- ============================================================
begin;

-- ---------- 1) Re-grant every profile column except the private ones ----------
do $$
declare cols text;
begin
  revoke select on table public.profiles from anon, authenticated;
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles'
    and column_name not in ('is_moderator', 'is_bot')
    and column_name not like 'bot\_%';
  execute format('grant select (%s) on table public.profiles to anon, authenticated', cols);
  raise notice 'profiles: granted % ', cols;
end $$;


-- ---------- 2) Prove the site still works, as the site's own roles ----------
do $$
declare n int; blocked boolean := false;
begin
  -- a logged-out visitor
  set local role anon;
  select count(*) into n from (select id, username, display_name, avatar_url, accent_color,
         banner_theme, tags, about_me, pronouns, status_weather, post_count, streak_count,
         umbrellas_sent, created_at from public.profiles limit 1) t;
  select count(*) into n from (select id from public.stories limit 1) t;
  select count(*) into n from (select vote_count from public.poll_options limit 1) t;
  begin
    select count(*) into n from (select is_moderator from public.profiles limit 1) t;
  exception when insufficient_privilege then blocked := true;
  end;
  reset role;
  if not blocked then
    raise exception 'is_moderator is STILL readable by logged-out visitors, rolling back';
  end if;

  -- a signed-in member
  set local role authenticated;
  select count(*) into n from (select id, username, discoverable, notify_email, onboarded
         from public.profiles limit 1) t;
  select count(*) into n from (select public.am_i_moderator()) t;
  reset role;

  raise notice 'checks passed: the site can read what it needs, moderators are hidden';
exception when others then
  reset role;
  raise;
end $$;

commit;


-- ---------- 3) Confirm ----------
select
  has_column_privilege('anon', 'public.profiles', 'is_moderator', 'SELECT')          as anon_can_see_moderators,
  has_column_privilege('anon', 'public.profiles', 'is_bot', 'SELECT')                as anon_can_see_bots,
  has_column_privilege('anon', 'public.profiles', 'username', 'SELECT')              as anon_can_still_read_profiles,
  has_column_privilege('authenticated', 'public.profiles', 'is_moderator', 'UPDATE') as users_can_make_themselves_mod,
  has_function_privilege('authenticated', 'public.am_i_moderator()', 'EXECUTE')      as members_can_check_own_mod_status;

-- If the site misbehaves afterwards, this puts it back exactly as it was:
--   grant select on table public.profiles to anon, authenticated;
