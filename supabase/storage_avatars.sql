-- Avatar uploads. Run once in Supabase SQL Editor.
-- Creates a public "avatars" bucket and locks writes so each user can only
-- put files in their own folder (named after their user id).

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- anyone can view avatars (public bucket)
create policy "avatars public read" on storage.objects for select
  using (bucket_id = 'avatars');

-- a logged-in user may upload/replace only files inside their own folder
create policy "users manage own avatar" on storage.objects for all
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
