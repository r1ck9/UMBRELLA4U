-- Take-down / delete feature. Run once in Supabase SQL Editor.

-- 1) a flag marking who can moderate (take down anyone's posts)
alter table profiles add column if not exists is_moderator boolean default false;

-- 2) permissions: authors can delete their OWN stories; moderators can delete ANY story
drop policy if exists "authors delete own story" on stories;
create policy "authors delete own story" on stories for delete
  using (auth.uid() = author_id);

drop policy if exists "moderators delete any story" on stories;
create policy "moderators delete any story" on stories for delete
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_moderator));

-- 3) AFTER you've signed up on the site, make YOURSELF a moderator.
--    Replace the email with your login email, then run just this statement:
--
--    update profiles set is_moderator = true
--    where id = (select id from auth.users where email = 'you@example.com');
