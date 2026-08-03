-- ============================================================
--  Umbrella — WEB PUSH (browser notifications that arrive when the tab/app is
--  closed). Run once in Supabase SQL Editor. Push delivery happens through the
--  app after the umbrella insert succeeds, so pg_net is not required.
--
--  Pairs with: public/sw.js, components/EnableWebPush.jsx, app/api/push/umbrella,
--  lib/webpush.js, and these Vercel env vars:
--    VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY,
--    VAPID_SUBJECT (optional), SUPABASE_SERVICE_ROLE_KEY
-- ============================================================

create table if not exists web_push_subs (
  endpoint   text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  sub        jsonb not null,
  updated_at timestamptz default now()
);
create index if not exists web_push_subs_user on web_push_subs(user_id);
alter table web_push_subs enable row level security;   -- server reads with service role
drop policy if exists "own web sub read" on web_push_subs;
create policy "own web sub read" on web_push_subs for select using (auth.uid() = user_id);
drop policy if exists "own web sub del" on web_push_subs;
create policy "own web sub del" on web_push_subs for delete using (auth.uid() = user_id);
-- inserts go through the RPC below (security definer)

create or replace function save_web_push_sub(sub jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare ep text;
begin
  if auth.uid() is null then raise exception using message = 'not_authenticated'; end if;
  ep := sub->>'endpoint';
  if ep is null then raise exception using message = 'no_endpoint'; end if;
  insert into web_push_subs(endpoint, user_id, sub, updated_at)
  values (ep, auth.uid(), sub, now())
  on conflict (endpoint) do update set user_id = excluded.user_id, sub = excluded.sub, updated_at = now();
end $$;
grant execute on function save_web_push_sub(jsonb) to authenticated;

create or replace function delete_web_push_sub(ep text) returns void
language sql security definer set search_path = public as $$
  delete from web_push_subs where endpoint = ep and user_id = auth.uid();
$$;
grant execute on function delete_web_push_sub(text) to authenticated;

-- Remove both legacy database push triggers. The client calls
-- /api/push/umbrella only after Supabase confirms the umbrella was saved, so a
-- notification outage can never roll back the core action.
drop trigger if exists trg_push_umbrella on public.umbrellas;
drop trigger if exists send_push_on_umbrella_insert on public.umbrellas;
drop function if exists public.notify_push_on_umbrella();
