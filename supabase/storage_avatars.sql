-- Haven profile photos: private storage + moderator approval.
-- Safe to re-run. A submitted photo never becomes a user's avatar until a
-- moderator approves it through review_profile_avatar().

create table if not exists public.profile_avatar_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  photo_path text not null unique,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  constraint profile_avatar_submission_status_check
    check (status in ('pending', 'approved', 'rejected', 'replaced'))
);

alter table public.profile_avatar_submissions
  drop constraint if exists profile_avatar_submission_path_check;
alter table public.profile_avatar_submissions
  add constraint profile_avatar_submission_path_check check (
    photo_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(webp|jpg)$'
  );

create unique index if not exists profile_avatar_one_pending_per_user_idx
  on public.profile_avatar_submissions (user_id)
  where status = 'pending';
drop index if exists public.profile_avatar_pending_created_idx;
create index if not exists profile_avatar_reviewed_by_idx
  on public.profile_avatar_submissions (reviewed_by);

alter table public.profile_avatar_submissions enable row level security;

drop policy if exists "members read own profile photo submissions" on public.profile_avatar_submissions;
drop policy if exists "moderators read profile photo submissions" on public.profile_avatar_submissions;
drop policy if exists "members or moderators read profile photo submissions" on public.profile_avatar_submissions;
create policy "members or moderators read profile photo submissions"
on public.profile_avatar_submissions for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_moderator
  )
);

drop policy if exists "members submit own profile photos" on public.profile_avatar_submissions;
create policy "members submit own profile photos"
on public.profile_avatar_submissions for insert to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'pending'
  and split_part(photo_path, '/', 1) = (select auth.uid())::text
);

drop policy if exists "members withdraw own pending profile photos" on public.profile_avatar_submissions;
create policy "members withdraw own pending profile photos"
on public.profile_avatar_submissions for delete to authenticated
using (user_id = (select auth.uid()) and status = 'pending');

revoke all on public.profile_avatar_submissions from anon, authenticated;
grant select, insert, delete on public.profile_avatar_submissions to authenticated;

-- Keep uploaded originals private. Approved photos are served only through the
-- checked /api/avatar route; pending photos are visible only to their owner and
-- moderators through short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', false, 2097152,
  array['image/webp', 'image/jpeg']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars public read" on storage.objects;
drop policy if exists "users manage own avatar" on storage.objects;
drop policy if exists "profile avatar upload for pending owner" on storage.objects;
create policy "profile avatar upload for pending owner"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = (select auth.uid())::text
  and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(webp|jpg)$'
  and exists (
    select 1 from public.profile_avatar_submissions s
    where s.user_id = (select auth.uid())
      and s.photo_path = name
      and s.status = 'pending'
  )
);

drop policy if exists "profile avatar owner or moderator read" on storage.objects;
create policy "profile avatar owner or moderator read"
on storage.objects for select to authenticated
using (
  bucket_id = 'avatars'
  and (
    owner_id = (select auth.uid())::text
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.is_moderator
    )
  )
);

drop policy if exists "profile avatar owner withdraw" on storage.objects;
create policy "profile avatar owner withdraw"
on storage.objects for delete to authenticated
using (
  bucket_id = 'avatars'
  and owner_id = (select auth.uid())::text
  and exists (
    select 1 from public.profile_avatar_submissions s
    where s.user_id = (select auth.uid())
      and s.photo_path = name
      and s.status = 'pending'
  )
);

-- Prevent the broad profile update policy from being used to point an avatar
-- at an arbitrary URL or an unapproved upload.
create or replace function public.enforce_safe_profile_avatar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.avatar_url is not distinct from new.avatar_url then
    return new;
  end if;

  if new.avatar_url is null
     or btrim(new.avatar_url) = ''
     or new.avatar_url ~ '^emoji:.{1,32}$' then
    return new;
  end if;

  if new.avatar_url ~ '^avatar:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(webp|jpg)$'
     and exists (
       select 1 from public.profile_avatar_submissions s
       where s.user_id = new.id
         and s.photo_path = substring(new.avatar_url from 8)
         and s.status = 'approved'
     ) then
    return new;
  end if;

  raise exception using message = 'invalid_or_unapproved_avatar';
end;
$$;

revoke all on function public.enforce_safe_profile_avatar() from public, anon, authenticated;
drop trigger if exists trg_enforce_safe_profile_avatar on public.profiles;
create trigger trg_enforce_safe_profile_avatar
before insert or update of avatar_url on public.profiles
for each row execute function public.enforce_safe_profile_avatar();

drop function if exists public.review_profile_avatar(uuid, text);
create or replace function public.review_profile_avatar(
  p_submission_id uuid,
  p_decision text,
  p_moderator_id uuid
)
returns table (
  decision text,
  recipient_id uuid,
  photo_path text,
  previous_photo_path text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_submission public.profile_avatar_submissions%rowtype;
  v_previous_value text;
  v_previous_path text;
begin
  if p_moderator_id is null or not exists (
    select 1 from public.profiles p
    where p.id = p_moderator_id and p.is_moderator
  ) then
    raise exception using message = 'not_authorized';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception using message = 'invalid_profile_avatar_decision';
  end if;

  select * into v_submission
  from public.profile_avatar_submissions s
  where s.id = p_submission_id and s.status = 'pending'
  for update;

  if not found then
    raise exception using message = 'profile_avatar_not_pending';
  end if;

  if p_decision = 'approved' then
    select p.avatar_url into v_previous_value
    from public.profiles p
    where p.id = v_submission.user_id
    for update;

    if v_previous_value like 'avatar:%' then
      v_previous_path := substring(v_previous_value from 8);
    end if;

    update public.profile_avatar_submissions
    set status = 'replaced'
    where user_id = v_submission.user_id and status = 'approved';

    update public.profile_avatar_submissions
    set status = 'approved', reviewed_at = now(), reviewed_by = p_moderator_id
    where id = p_submission_id;

    update public.profiles
    set avatar_url = 'avatar:' || v_submission.photo_path
    where id = v_submission.user_id;
  else
    update public.profile_avatar_submissions
    set status = 'rejected', reviewed_at = now(), reviewed_by = p_moderator_id
    where id = p_submission_id;

    insert into public.media_review_notifications (
      user_id, story_id, decision, message, story_excerpt
    ) values (
      v_submission.user_id,
      null,
      'rejected',
      'Your profile photo wasn''t approved. Your current profile picture has not changed.',
      ''
    );
  end if;

  return query
  select p_decision, v_submission.user_id, v_submission.photo_path, v_previous_path;
end;
$$;

revoke all on function public.review_profile_avatar(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.review_profile_avatar(uuid, text, uuid) to service_role;
