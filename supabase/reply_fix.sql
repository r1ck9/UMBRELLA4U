-- ============================================================
--  Fix "no_bot_available" when replying from the queue.
--  Run once in Supabase SQL Editor. Safe to re-run.
--
--  Two bugs in reply_as_bot():
--    1) Anonymous posts have author_id = NULL, so `p.id <> a` evaluated to NULL
--       and filtered out EVERY bot -> no_bot_available.
--    2) Once the drip has given a post umbrellas from most bots, there was no
--       fresh bot left to insert a new umbrella row for the reply.
--
--  Fix: null-safe author check, and prefer attaching the word to a bot that
--  ALREADY opened an umbrella here (natural: they stood with you, then spoke).
--  Only insert a brand-new umbrella if no such bot exists.
-- ============================================================

-- Keep the safety filter (names / PII / blocked words) firing when a note is
-- attached via UPDATE, not just on INSERT.
drop trigger if exists trg_screen_umbrella on umbrellas;
create trigger trg_screen_umbrella before insert or update of note on umbrellas
  for each row execute function screen_umbrella_note();

create or replace function reply_as_bot(sid uuid, body text) returns void
language plpgsql security definer set search_path = public as $$
declare bot uuid; a uuid; note_body text;
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_moderator) then
    raise exception using message = 'not_authorized';
  end if;
  note_body := nullif(btrim(body), '');
  select author_id into a from stories where id = sid;

  -- Prefer a bot that already opened an umbrella here but hasn't left a word.
  select u.user_id into bot
    from umbrellas u
    join profiles p on p.id = u.user_id
   where u.story_id = sid and p.is_bot and u.note is null
     and (a is null or u.user_id <> a)
   order by random() limit 1;

  if bot is not null then
    update umbrellas set note = note_body where story_id = sid and user_id = bot;
    update owner_reply_queue set replied = true, replied_at = now() where story_id = sid;
    return;
  end if;

  -- Otherwise, a bot not yet on this story opens an umbrella and leaves the word.
  select p.id into bot from profiles p
   where p.is_bot and (a is null or p.id <> a)
     and not exists (select 1 from umbrellas u where u.story_id = sid and u.user_id = p.id)
   order by random() limit 1;
  if bot is null then raise exception using message = 'no_bot_available'; end if;

  insert into umbrellas (story_id, user_id, note) values (sid, bot, note_body);
  update owner_reply_queue set replied = true, replied_at = now() where story_id = sid;
end $$;
grant execute on function reply_as_bot(uuid, text) to authenticated;
