-- ============================================================
--  FOLLOW-UP  (run after security_audit_fixes.sql)
--  1. Fixes an error that run introduced for logged-out visitors.
--  2. Reports what is still keeping is_moderator / is_bot readable.
--  Safe to re-run. Deletes nothing.
-- ============================================================

-- ---------- 1) FIX: "permission denied for function am_i_moderator" ----------
-- The new relevance_marks rule calls am_i_moderator(), but logged-out visitors
-- weren't allowed to call it, so their reads errored instead of returning
-- nothing. The function only ever reports on whoever is calling it, and for a
-- logged-out visitor that is always false, so letting anon call it is safe.
grant execute on function public.am_i_moderator() to anon;


-- ---------- 2) REPORT: what still reads is_moderator / is_bot? ----------
-- Copy BOTH result tables back to Claude. They say exactly which rules and
-- functions have to change before those columns can be hidden.
select 'policy' as kind, schemaname || '.' || tablename as on_what, policyname as name,
       cmd, coalesce(qual, '') as using_expression, coalesce(with_check, '') as check_expression
from pg_policies
where schemaname = 'public'
  and (coalesce(qual, '') ~ '(is_moderator|is_bot)' or coalesce(with_check, '') ~ '(is_moderator|is_bot)')
order by on_what, name;

select 'function' as kind, n.nspname || '.' || p.proname as on_what,
       pg_get_function_identity_arguments(p.oid) as args,
       case when p.prosecdef then 'security definer' else 'security invoker' end as runs_as
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and not p.prosecdef
  and p.prosrc ~ '(is_moderator|is_bot)'
  and p.proname <> 'protect_privileged_profile_cols'
order by on_what;


-- ---------- 3) Where things stand ----------
select
  has_column_privilege('anon', 'public.profiles', 'is_moderator', 'SELECT')          as anon_can_see_moderators,
  has_column_privilege('authenticated', 'public.profiles', 'is_moderator', 'UPDATE') as users_can_make_themselves_mod,
  has_table_privilege('anon', 'public.bot_metrics', 'SELECT')                        as anon_can_read_bot_roster,
  has_function_privilege('anon', 'public.drip_umbrellas()', 'EXECUTE')               as anon_can_run_bot_engine,
  has_function_privilege('anon', 'public.am_i_moderator()', 'EXECUTE')               as anon_may_call_am_i_moderator,
  (select count(*) from public.stories where anonymous and author_id is not null)    as anonymous_posts_exposing_author;
