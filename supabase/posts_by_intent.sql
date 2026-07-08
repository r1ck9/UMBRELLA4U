-- ============================================================
--  Umbrella — posts broken down by intent (type), for the moderator panel.
--  Run once in Supabase SQL Editor. Safe to re-run. Moderator-gated.
--
--  Per intent: total count + average per day. "days" is the span from the
--  first Story ever posted to today (America/Vancouver), so avg_per_day is a
--  lifetime daily rate on a consistent baseline. Same value on every row.
-- ============================================================

create or replace function posts_by_intent()
returns table(intent text, total bigint, avg_per_day numeric, days int)
language plpgsql security definer set search_path = public as $$
declare d int;
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_moderator) then
    raise exception using message = 'not_authorized';
  end if;
  select coalesce(greatest(1,
           ((now() at time zone 'America/Vancouver')::date
            - (min(created_at) at time zone 'America/Vancouver')::date) + 1), 1)
    into d
  from stories;
  return query
  select s.intent,
         count(*)::bigint,
         round(count(*)::numeric / d, 2),
         d
  from stories s
  group by s.intent;
end $$;

grant execute on function posts_by_intent() to authenticated;
