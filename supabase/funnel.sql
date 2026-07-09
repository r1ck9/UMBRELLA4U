-- ============================================================
--  Umbrella — signup/first-post funnel analytics. Run once in Supabase SQL
--  Editor. Safe to re-run. Privacy-safe: we store only a random client-side
--  visitor id + a step name (no content, no accounts, no PII). One row per
--  visitor per step, so counts are distinct people.
-- ============================================================

create table if not exists funnel_events (
  visitor    text not null,
  event      text not null,
  created_at timestamptz default now(),
  primary key (visitor, event)   -- a visitor counts once per step
);
alter table funnel_events enable row level security;   -- writes + reads only via the functions below

-- Record a step (called from the browser). Validates the step name; ignores
-- anything else. Deduped by the primary key.
create or replace function track_event(vid text, ev text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if ev not in ('visit','stayed_30s','click_signup','registered',
                'click_create','compose_start','compose_abandon','posted') then
    return;
  end if;
  if vid is null or length(vid) < 8 or length(vid) > 64 then return; end if;
  insert into funnel_events (visitor, event) values (vid, ev) on conflict do nothing;
end $$;
grant execute on function track_event(text, text) to anon, authenticated;

-- Moderator-only: distinct visitors at each step.
create or replace function funnel_counts() returns table(event text, visitors bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_moderator) then
    raise exception using message = 'not_authorized';
  end if;
  return query select fe.event, count(*)::bigint from funnel_events fe group by fe.event;
end $$;
grant execute on function funnel_counts() to authenticated;
