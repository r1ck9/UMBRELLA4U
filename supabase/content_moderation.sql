-- Content moderation: reject harmful stories at write time.
-- Run once in Supabase SQL Editor. This is the REAL gate — it runs in the
-- database, so it can't be bypassed from the browser (unlike the client check).

-- A blocklist you can grow over time.
create table if not exists blocked_terms ( term text primary key );
alter table blocked_terms enable row level security;  -- not exposed via the API

-- Starter list — EXPAND THIS, and add an AI moderation API for real coverage
-- (this simple list only catches exact substrings).
insert into blocked_terms (term) values
  ('kill yourself'), ('kys'), ('go die'), ('you should die'),
  ('faggot'), ('nigger'), ('retard'), ('tranny'), ('kike'), ('spic')
on conflict do nothing;

-- Reject an insert whose text contains any blocked term.
create or replace function screen_story() returns trigger
language plpgsql security definer set search_path = public as $$
declare hit text;
begin
  select term into hit from blocked_terms
  where new.text ilike '%' || term || '%'
  limit 1;
  if hit is not null then
    raise exception using message = 'blocked_content';
  end if;
  return new;
end $$;

drop trigger if exists trg_screen_story on stories;
create trigger trg_screen_story before insert on stories
  for each row execute function screen_story();
