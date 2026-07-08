-- ============================================================
--  Umbrella — engagement + activation stats for the moderator panel.
--  Run once in Supabase SQL Editor. Safe to re-run. Moderator-gated.
--
--  Returns raw counts; the UI does the per-user division so rounding lives in
--  one place. "replies" = umbrellas that carry a note (a "just listen" umbrella
--  has none). "never_posted" = registered accounts with zero stories — the
--  activation gap (people who signed up but haven't shared yet).
-- ============================================================

create or replace function engagement_stats()
returns table(
  users bigint,
  posters bigint,
  never_posted bigint,
  stories bigint,
  umbrellas bigint,
  replies bigint
)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_moderator) then
    raise exception using message = 'not_authorized';
  end if;
  return query
  with u as (select count(*)::bigint n from profiles),
       p as (select count(distinct author_id)::bigint n from stories where author_id is not null)
  select
    u.n,
    p.n,
    (u.n - p.n),
    (select count(*) from stories)::bigint,
    (select count(*) from umbrellas)::bigint,
    (select count(*) from umbrellas where note is not null and btrim(note) <> '')::bigint
  from u, p;
end $$;

grant execute on function engagement_stats() to anon, authenticated;
