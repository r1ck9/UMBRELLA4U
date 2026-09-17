-- ============================================================
--  HIDE is_moderator / is_bot  (corrected)
--  The previous version didn't stick. Two likely reasons, both fixed here:
--    1. It only revoked from anon and authenticated. A grant to PUBLIC would
--       survive that and keep the columns readable.
--    2. It wrapped itself in begin/commit, which fights the SQL editor's own
--       transaction, so a rollback could pass by unnoticed.
--  This version is plain statements. Run it and read the two tables at the end.
--  Safe to re-run. Deletes nothing.
-- ============================================================

-- ---------- 1) BEFORE: who currently holds read access on profiles? ----------
select grantee, string_agg(distinct privilege_type, ', ' order by privilege_type) as privileges
from information_schema.table_privileges
where table_schema = 'public' and table_name = 'profiles'
group by grantee
order by grantee;


-- ---------- 2) Take the blanket grants away, from every role ----------
revoke select on table public.profiles from public;
revoke select on table public.profiles from anon;
revoke select on table public.profiles from authenticated;


-- ---------- 3) Give back every column except the private ones ----------
do $$
declare cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles'
    and column_name not in ('is_moderator', 'is_bot')
    and column_name not like 'bot\_%';
  execute format('grant select (%s) on table public.profiles to anon, authenticated', cols);
  raise notice 'profiles readable columns: %', cols;
end $$;


-- ---------- 4) AFTER: every one of these should read false ----------
select
  has_column_privilege('anon',          'public.profiles', 'is_moderator', 'SELECT') as anon_sees_moderators,
  has_column_privilege('authenticated', 'public.profiles', 'is_moderator', 'SELECT') as members_see_moderators,
  has_column_privilege('anon',          'public.profiles', 'is_bot',       'SELECT') as anon_sees_bots,
  -- these two must stay TRUE, or the site can't render profiles
  has_column_privilege('anon',          'public.profiles', 'username',     'SELECT') as anon_reads_usernames,
  has_column_privilege('authenticated', 'public.profiles', 'avatar_url',   'SELECT') as members_read_avatars;

-- Undo, if the site misbehaves:
--   grant select on table public.profiles to anon, authenticated;
