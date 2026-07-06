-- ============================================================
--  Umbrella moderation setup — run once in Supabase SQL Editor.
--  Safe to re-run. Covers: word filter, moderator flag, take-down
--  permissions, and the report queue.
-- ============================================================

-- ---------- 1) WORD FILTER ----------
create table if not exists blocked_terms ( term text primary key );
alter table blocked_terms enable row level security;

-- Reseed the blocklist. Edit freely: `delete from blocked_terms where term = '...';`
-- to remove one, or `insert into blocked_terms (term) values ('...');` to add one.
delete from blocked_terms;
insert into blocked_terms (term) values
  -- profanity (consider removing these for a venting space)
  ('fuck'),('fucking'),('fucker'),('fuckers'),('fuckhead'),('motherfucker'),('mother fucker'),
  ('shit'),('shitty'),('shithead'),('bullshit'),('bitch'),('bitches'),('asshole'),('assholes'),
  ('bastard'),('dick'),('dickhead'),('cunt'),('cock'),('pussy'),('whore'),('slut'),('prick'),
  ('twat'),('wanker'),('bollocks'),('douchebag'),('jackass'),('dumbass'),('piss'),('ass'),
  -- slurs (strongly recommended to keep)
  ('nigger'),('niggers'),('nigga'),('niggas'),('faggot'),('faggots'),('fag'),('fags'),
  ('retard'),('retards'),('retarded'),('tranny'),('trannies'),('kike'),('spic'),('chink'),
  ('gook'),('wetback'),('coon'),('dyke'),('beaner'),('paki'),
  -- harassment / telling OTHERS to self-harm (keep — this is targeted abuse)
  ('kill yourself'),('kill yourselves'),('kill urself'),('kys'),('go kill yourself'),
  ('go die'),('you should die')
on conflict do nothing;

-- Whole-word, case-insensitive match (won't block "class", "assignment", "spicy", etc.)
create or replace function screen_story() returns trigger
language plpgsql security definer set search_path = public as $$
declare pattern text;
begin
  select '\y(' || string_agg(term, '|') || ')\y' into pattern from blocked_terms;
  if pattern is not null and new.text ~* pattern then
    raise exception using message = 'blocked_content';
  end if;
  return new;
end $$;
drop trigger if exists trg_screen_story on stories;
create trigger trg_screen_story before insert on stories
  for each row execute function screen_story();

-- ---------- 2) MODERATOR FLAG ----------
alter table profiles add column if not exists is_moderator boolean default false;

-- ---------- 3) TAKE-DOWN PERMISSIONS ----------
drop policy if exists "authors delete own story" on stories;
create policy "authors delete own story" on stories for delete
  using (auth.uid() = author_id);

drop policy if exists "moderators delete any story" on stories;
create policy "moderators delete any story" on stories for delete
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_moderator));

-- ---------- 4) REPORT QUEUE (moderators read + resolve) ----------
drop policy if exists "mods read reports" on reports;
create policy "mods read reports" on reports for select
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_moderator));

drop policy if exists "mods update reports" on reports;
create policy "mods update reports" on reports for update
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_moderator))
  with check (true);

-- ---------- 5) MAKE YOURSELF A MODERATOR ----------
-- AFTER you've signed up on the site, run this with your login email:
--   update profiles set is_moderator = true
--   where id = (select id from auth.users where email = 'you@example.com');
