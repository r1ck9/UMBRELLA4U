-- ============================================================
--  Community banner = REAL people only. Excludes the bot fleet and seeded
--  content, so the public numbers match the moderation data. Run in the SQL
--  Editor. Safe to re-run.
--
--  "real" = umbrella given by a non-bot user; post that isn't seeded and isn't
--  bot-authored; member that isn't a bot. (Per-post umbrella counts on cards are
--  unchanged — only the banner aggregates become real-only.)
-- ============================================================

-- Total umbrellas the banner shows: only those opened by real users.
create or replace function community_umbrellas() returns bigint
language sql security definer set search_path = public stable as $$
  select count(*)::bigint from umbrellas u
  where not exists (select 1 from profiles p where p.id = u.user_id and p.is_bot)
$$;
grant execute on function community_umbrellas() to anon, authenticated;

-- Banner pulse — every number real-only.
create or replace function community_pulse()
returns table(umbrellas bigint, stories bigint, members bigint, umbrellas_today bigint)
language sql security definer set search_path = public stable as $$
  select
    (select count(*) from umbrellas u
       where not exists (select 1 from profiles p where p.id = u.user_id and p.is_bot)),
    (select count(*) from stories s
       where s.state = 'live' and coalesce(s.seed, false) = false
         and (s.author_id is null or not exists (select 1 from profiles p where p.id = s.author_id and p.is_bot))),
    (select count(*) from profiles where not coalesce(is_bot, false)),
    (select count(*) from umbrellas u
       where u.created_at >= app_day_start()
         and not exists (select 1 from profiles p where p.id = u.user_id and p.is_bot))
$$;
grant execute on function community_pulse() to anon, authenticated;

-- "Skies cleared" — real posts (not seeded / not bot-authored) that hit sunny.
create or replace function sunny_count() returns bigint
language sql security definer set search_path = public stable as $$
  select count(*)::bigint from stories s
  where s.state = 'live' and coalesce(s.seed, false) = false
    and (s.author_id is null or not exists (select 1 from profiles p where p.id = s.author_id and p.is_bot))
    and s.umbrella_count >=
      case coalesce(s.weather, -1)
        when 0 then 50 when 1 then 35 when 2 then 22 when 3 then 12 when 4 then 8 else 50 end
$$;
grant execute on function sunny_count() to anon, authenticated;
