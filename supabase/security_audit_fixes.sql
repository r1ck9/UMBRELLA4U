-- ============================================================
--  UMBRELLA4U — SECURITY AUDIT FIXES
--  Found by probing the LIVE API as an anonymous visitor with only the public
--  key. Run this whole file once in the Supabase SQL Editor. Safe to re-run.
--  Nothing here deletes user content.
--
--  What was live and exploitable:
--   1. Profile columns weren't locked, so the moderator-takeover fix may not be
--      in place, and its trigger checked session_user, which is always
--      'authenticator' on Supabase, so it never fired.
--   2. Anyone could list every moderator (2) and every bot (200) from profiles.
--   3. bot_metrics, the full bot roster, was readable by anyone.
--   4. 24 seeded "anonymous" posts still exposed their (bot) author_id.
--   5. Anyone, even logged out, could run drip_umbrellas(), the bot engine.
--   6. hugs, poll_votes and relevance_marks showed which user hugged, voted on
--      or flagged which post. Opening an umbrella also sends a hug, so this
--      undid the umbrella privacy fix.
-- ============================================================


-- ---------- 0) BEFORE: who holds moderator power right now? ----------
-- Make sure both accounts are people you trust.
select id, username, created_at from public.profiles where is_moderator order by created_at;


-- ---------- helper: "am I a moderator?" without reading the column ----------
-- Access rules and the app use this, so the is_moderator column itself can be
-- hidden from the public API.
create or replace function public.am_i_moderator() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_moderator from public.profiles p where p.id = auth.uid()), false)
$$;
revoke all on function public.am_i_moderator() from public, anon;
grant execute on function public.am_i_moderator() to authenticated;


-- ---------- 1) MODERATOR TAKEOVER ----------
-- Users may update only their own non-privileged profile fields.
do $$
declare cols text;
begin
  revoke insert, update on table public.profiles from anon, authenticated;
  select string_agg(quote_ident(column_name), ', ') into cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles'
    and column_name not in ('id','is_moderator','is_bot','post_count','streak_count','umbrellas_sent',
                            'created_at','last_active_date','last_notified_at','last_reengaged_at')
    and column_name not like 'bot\_%';
  execute format('grant update (%s) on table public.profiles to authenticated', cols);
end $$;

-- Second layer. current_user is the API role for REST calls. The old version
-- checked session_user, which on Supabase is always 'authenticator', so it
-- never blocked anything.
create or replace function public.protect_privileged_profile_cols() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      if coalesce(new.is_moderator, false) or coalesce(new.is_bot, false) then
        raise exception using message = 'cannot_modify_privileged_columns';
      end if;
    elsif new.is_moderator is distinct from old.is_moderator
       or coalesce(new.is_bot, false) is distinct from coalesce(old.is_bot, false) then
      raise exception using message = 'cannot_modify_privileged_columns';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_protect_profile on public.profiles;
create trigger trg_protect_profile before insert or update on public.profiles
  for each row execute function public.protect_privileged_profile_cols();


-- ---------- 2) HIDE WHO IS A MODERATOR OR A BOT ----------
-- Access rules that read profiles.is_moderator run with the caller's rights, so
-- hiding the column would break them. Rewrite the common "EXISTS (… is_moderator)"
-- clause to use am_i_moderator(). Then hide the columns ONLY if nothing still
-- reads them; otherwise skip and report, so no page breaks.
do $$
declare r record; q text; w text; pat text; stmt text; remaining int; invoker_fns int; cols text;
begin
  pat := 'EXISTS \( SELECT 1\s+FROM (public\.)?profiles(\s+\w+)?\s+WHERE \(\(\(?(\w+\.)?id = auth\.uid\(\)\)\)? AND (\w+\.)?is_moderator\)\)';
  for r in select * from pg_policies where schemaname = 'public'
             and (coalesce(qual,'') ~ 'is_moderator' or coalesce(with_check,'') ~ 'is_moderator') loop
    q := regexp_replace(coalesce(r.qual, ''), pat, 'public.am_i_moderator()', 'g');
    w := regexp_replace(coalesce(r.with_check, ''), pat, 'public.am_i_moderator()', 'g');
    if q ~ 'is_moderator' or w ~ 'is_moderator' then
      raise notice 'left unchanged (unrecognised shape): policy "%" on %', r.policyname, r.tablename;
      continue;
    end if;
    stmt := format('alter policy %I on public.%I', r.policyname, r.tablename);
    if r.qual is not null then stmt := stmt || format(' using (%s)', q); end if;
    if r.with_check is not null then stmt := stmt || format(' with check (%s)', w); end if;
    execute stmt;
    raise notice 'policy "%" on % now uses am_i_moderator()', r.policyname, r.tablename;
  end loop;

  select count(*) into remaining from pg_policies where schemaname = 'public'
    and (coalesce(qual,'') ~ '(is_moderator|is_bot)' or coalesce(with_check,'') ~ '(is_moderator|is_bot)');
  select count(*) into invoker_fns from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and not p.prosecdef and p.prosrc ~ '(is_moderator|is_bot)'
      and p.proname <> 'protect_privileged_profile_cols';

  if remaining = 0 and invoker_fns = 0 then
    revoke select on table public.profiles from anon, authenticated;
    select string_agg(quote_ident(column_name), ', ') into cols
    from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name not in ('is_moderator','is_bot') and column_name not like 'bot\_%';
    execute format('grant select (%s) on table public.profiles to anon, authenticated', cols);
    raise notice 'is_moderator / is_bot / bot_* are now hidden from the public API';
  else
    raise notice 'NOT hiding is_moderator/is_bot yet: % access rule(s) and % invoker function(s) still read them. Everything else in this file still applied.', remaining, invoker_fns;
  end if;
end $$;


-- ---------- 3) BOT ROSTER VIEW ----------
do $$ begin
  if to_regclass('public.bot_metrics') is not null then
    execute 'alter view public.bot_metrics set (security_invoker = on)';
    execute 'revoke all on public.bot_metrics from public, anon, authenticated';
  end if;
end $$;


-- ---------- 4) SEAL THE LEFTOVER "ANONYMOUS" SEED POSTS ----------
-- Keep the private author link, then remove the public one.
insert into public.story_authors (story_id, author_id)
select id, author_id from public.stories where anonymous and author_id is not null
on conflict (story_id) do nothing;
update public.stories set author_id = null, author_name = null
where anonymous and author_id is not null;


-- ---------- 5) BOT ENGINE: server-only ----------
-- pg_cron runs it as the owner, so the scheduled drip keeps working.
do $$ begin
  if to_regprocedure('public.drip_umbrellas()') is not null then
    execute 'revoke all on function public.drip_umbrellas() from public, anon, authenticated';
  end if;
end $$;


-- ---------- 6) WHO HUGGED / VOTED / FLAGGED WHAT ----------
-- You can read only your own rows. Hug faces come from story_huggers() and poll
-- tallies from poll_options, so the feed still shows both.
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies
           where schemaname = 'public' and tablename in ('hugs','poll_votes','relevance_marks') and cmd = 'SELECT' loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
  for r in select policyname, tablename from pg_policies
           where schemaname = 'public' and tablename in ('hugs','poll_votes','relevance_marks')
             and cmd = 'ALL' and coalesce(qual,'') = 'true' loop
    raise notice 'check policy "%" on %: FOR ALL USING (true) still exposes rows', r.policyname, r.tablename;
  end loop;
end $$;
create policy "read own hugs" on public.hugs for select using (auth.uid() = user_id);
create policy "read own poll votes" on public.poll_votes for select using (auth.uid() = user_id);
create policy "read own relevance marks" on public.relevance_marks for select
  using (auth.uid() = user_id or public.am_i_moderator());

-- Live poll results now follow the public tallies instead of other people's votes.
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'poll_options') then
    execute 'alter publication supabase_realtime add table public.poll_options';
  end if;
end $$;


-- ---------- 7) AFTER: every row should read false / 0 ----------
select
  has_column_privilege('anon', 'public.profiles', 'is_moderator', 'SELECT')          as anon_can_see_moderators,
  has_column_privilege('authenticated', 'public.profiles', 'is_moderator', 'UPDATE') as users_can_make_themselves_mod,
  has_table_privilege('anon', 'public.bot_metrics', 'SELECT')                        as anon_can_read_bot_roster,
  has_function_privilege('anon', 'public.drip_umbrellas()', 'EXECUTE')              as anon_can_run_bot_engine,
  has_function_privilege('authenticated', 'public.drip_umbrellas()', 'EXECUTE')     as users_can_run_bot_engine,
  (select count(*) from public.stories where anonymous and author_id is not null)    as anonymous_posts_exposing_author;
