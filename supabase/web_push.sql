-- ============================================================
--  Umbrella — WEB PUSH (browser notifications that arrive when the tab/app is
--  closed). Run once in Supabase SQL Editor. Requires the pg_net extension
--  (Dashboard → Database → Extensions → enable "pg_net").
--
--  Pairs with: public/sw.js, components/EnableWebPush.jsx, app/api/push/notify,
--  lib/webpush.js, and these Vercel env vars:
--    VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY,
--    VAPID_SUBJECT (optional), PUSH_SECRET, SUPABASE_SERVICE_ROLE_KEY
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

-- Your deployed site URL + a shared secret that MUST equal the PUSH_SECRET env
-- var on Vercel. Update the secret before going live:
--   update push_config set secret = '<same-as-PUSH_SECRET>' where id = 1;
create table if not exists push_config (id int primary key default 1, site_url text, secret text);
insert into push_config(id, site_url, secret)
  values (1, 'https://umbrella4u.ca', 'CHANGE_ME_TO_MATCH_PUSH_SECRET')
  on conflict (id) do nothing;

create extension if not exists pg_net;   -- if this errors, enable pg_net in the dashboard first

-- When a REAL person (not a bot, not the author) opens an umbrella or leaves a
-- word on a story, push the story's author in the background.
create or replace function notify_push_on_umbrella() returns trigger
language plpgsql security definer set search_path = public as $$
declare a uuid; nurl text; sec text; msg text;
begin
  select author_id into a from stories where id = new.story_id;
  if a is null or a = new.user_id then return new; end if;                        -- no target / self
  if exists (select 1 from profiles where id = new.user_id and is_bot) then return new; end if;  -- skip bot drip
  select site_url, secret into nurl, sec from push_config where id = 1;
  if nurl is null or sec is null then return new; end if;
  msg := case when new.note is not null and btrim(new.note) <> ''
              then 'Someone left you a word 💬'
              else 'Someone opened an umbrella on your story ☂' end;
  perform net.http_post(
    url := nurl || '/api/push/notify',
    headers := jsonb_build_object('Content-Type','application/json'),
    body := jsonb_build_object('user_id', a, 'title', 'Haven ☂', 'body', msg, 'url', '/inbox', 'secret', sec)
  );
  return new;
end $$;
drop trigger if exists trg_push_umbrella on umbrellas;
create trigger trg_push_umbrella after insert on umbrellas
  for each row execute function notify_push_on_umbrella();
