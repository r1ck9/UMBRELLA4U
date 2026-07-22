-- ============================================================
--  Umbrella — "thank you back". Run once in Supabase SQL Editor. Safe to re-run.
--  When someone leaves you a word (an umbrella note) on your story, you can send
--  a short thank-you back. It lands in that person's inbox. Stays out of the
--  umbrella/reply metrics (it's its own table, not an umbrella row).
-- ============================================================

create table if not exists thanks (
  id uuid primary key default gen_random_uuid(),
  umbrella_id uuid references umbrellas(id) on delete cascade,
  from_user uuid references auth.users(id) on delete cascade,   -- the story author saying thanks
  to_user   uuid references auth.users(id) on delete cascade,   -- whoever left the word
  story_id  uuid references stories(id) on delete cascade,
  message   text not null,
  created_at timestamptz not null default now(),
  unique (umbrella_id, from_user)          -- one thank-you per reply
);

alter table thanks enable row level security;

-- You can read a thank-you you received, or one you sent (to show "Sent" state).
drop policy if exists "read own thanks" on thanks;
create policy "read own thanks" on thanks for select
  using (auth.uid() = to_user or auth.uid() = from_user);
-- No insert policy: inserts happen only through send_thanks() below.

-- Send a thank-you back to whoever left the word on umbrella `u_id`.
-- Verifies the caller actually authored that story (works for anonymous posts
-- too, via story_authors) and that `u_id` is a real reply on it.
create or replace function send_thanks(u_id uuid, msg text) returns void
language plpgsql security definer set search_path = public as $$
declare sid uuid; recipient uuid; body text;
begin
  body := btrim(coalesce(msg, ''));
  if body = '' then raise exception using message = 'empty_message'; end if;
  body := left(body, 200);

  select story_id, user_id into sid, recipient from umbrellas where id = u_id;
  if sid is null then raise exception using message = 'reply_not_found'; end if;

  if not exists (select 1 from story_authors where story_id = sid and author_id = auth.uid()) then
    raise exception using message = 'not_your_story';
  end if;
  if recipient is null or recipient = auth.uid() then
    raise exception using message = 'cannot_thank';
  end if;

  insert into thanks (umbrella_id, from_user, to_user, story_id, message)
  values (u_id, auth.uid(), recipient, sid, body)
  on conflict (umbrella_id, from_user) do nothing;
end $$;
grant execute on function send_thanks(uuid, text) to authenticated;
