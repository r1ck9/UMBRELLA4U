-- Fix story posting when Supabase pg_net is unavailable.
-- Run this once in the Supabase SQL editor for the live project.
-- Push notifications remain optional; story and umbrella inserts keep working.

create or replace function notify_push_on_umbrella() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  a uuid;
  nurl text;
  sec text;
  msg text;
  request_id bigint;
begin
  select author_id into a from stories where id = new.story_id;
  if a is null or a = new.user_id then return new; end if;
  if exists (select 1 from profiles where id = new.user_id and is_bot) then return new; end if;
  select site_url, secret into nurl, sec from push_config where id = 1;
  if nurl is null or sec is null then return new; end if;
  msg := case when new.note is not null and btrim(new.note) <> ''
              then 'Someone left you a word'
              else 'Someone opened an umbrella on your story' end;

  if to_regnamespace('net') is null then return new; end if;
  begin
    execute 'select net.http_post(url := $1, headers := $2, body := $3)'
      into request_id
      using nurl || '/api/push/notify',
            jsonb_build_object('Content-Type','application/json'),
            jsonb_build_object('user_id', a, 'title', 'Haven', 'body', msg, 'url', '/inbox', 'secret', sec);
  exception when undefined_function or undefined_schema or invalid_schema_name then
    null;
  end;
  return new;
end $$;

drop trigger if exists trg_push_umbrella on umbrellas;
create trigger trg_push_umbrella after insert on umbrellas
for each row execute function notify_push_on_umbrella();
