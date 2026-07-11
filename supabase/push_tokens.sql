-- ============================================================
--  Umbrella — push notification device tokens. Run once in Supabase SQL Editor.
--  Safe to re-run. Each signed-in member can register one or more devices; the
--  server (notify cron) sends pushes to these tokens via FCM.
-- ============================================================

create table if not exists device_tokens (
  user_id    uuid not null references auth.users(id) on delete cascade,
  token      text not null,
  platform   text not null default 'unknown' check (platform in ('ios','android','web','unknown')),
  updated_at timestamptz default now(),
  primary key (token)                      -- a device token belongs to one account
);
create index if not exists device_tokens_user on device_tokens(user_id);

alter table device_tokens enable row level security;   -- writes only via the RPC below; server reads with service role

-- A member registers/refreshes their own device token. Reassigns the token to
-- the current user if it moved accounts (shared device / re-login).
create or replace function save_push_token(tok text, plat text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception using message = 'not_authenticated'; end if;
  if tok is null or length(tok) < 10 then return; end if;
  insert into device_tokens (user_id, token, platform, updated_at)
  values (auth.uid(), tok, coalesce(plat, 'unknown'), now())
  on conflict (token) do update
    set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end $$;
grant execute on function save_push_token(text, text) to authenticated;

-- Let a user drop a token (e.g. on logout / notifications turned off).
create or replace function delete_push_token(tok text) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from device_tokens where token = tok and user_id = auth.uid();
end $$;
grant execute on function delete_push_token(text) to authenticated;
