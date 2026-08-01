-- Haven media posts: private photo storage + human moderation queue.
-- Safe to re-run. Text-only posts remain live immediately; every new GIF or
-- uploaded photo is forced into a hidden pending state until a moderator acts.

alter table public.stories add column if not exists photo_path text;
alter table public.stories add column if not exists media_status text not null default 'none';
alter table public.stories add column if not exists media_reviewed_at timestamptz;
alter table public.stories add column if not exists media_reviewed_by uuid references auth.users(id) on delete set null;
alter table public.stories add column if not exists media_rejection_reason text;

-- GIFs that existed before this queue were already published, so preserve them.
update public.stories
set media_status = 'approved', media_reviewed_at = coalesce(media_reviewed_at, created_at)
where giphy_id is not null and media_status = 'none';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'stories_media_status_check'
      and conrelid = 'public.stories'::regclass
  ) then
    alter table public.stories add constraint stories_media_status_check
      check (media_status in ('none', 'pending', 'approved', 'rejected'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'stories_photo_path_format'
      and conrelid = 'public.stories'::regclass
  ) then
    alter table public.stories add constraint stories_photo_path_format
      check (photo_path is null or photo_path ~ '^uploads/[0-9a-f-]{36}\.(webp|jpg)$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'stories_one_media_attachment'
      and conrelid = 'public.stories'::regclass
  ) then
    alter table public.stories add constraint stories_one_media_attachment
      check (not (giphy_id is not null and photo_path is not null));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'stories_media_status_consistency'
      and conrelid = 'public.stories'::regclass
  ) then
    alter table public.stories add constraint stories_media_status_consistency
      check (
        (giphy_id is null and photo_path is null and media_status = 'none')
        or
        ((giphy_id is not null or photo_path is not null)
          and media_status in ('pending', 'approved', 'rejected'))
      );
  end if;
end $$;

create index if not exists stories_pending_media_created_idx
  on public.stories (created_at desc)
  where media_status = 'pending';

create or replace function public.queue_media_story()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- These values are never trusted from the browser. This trigger is the
  -- unbypassable gate that keeps media out of the public feed.
  if new.giphy_id is not null or new.photo_path is not null then
    new.state := 'hidden';
    new.media_status := 'pending';
  else
    new.state := 'live';
    new.media_status := 'none';
  end if;
  new.media_reviewed_at := null;
  new.media_reviewed_by := null;
  new.media_rejection_reason := null;
  return new;
end;
$$;

drop trigger if exists trg_queue_media_story on public.stories;
create trigger trg_queue_media_story
before insert on public.stories
for each row execute function public.queue_media_story();

-- Authors can see only their own non-public media submissions. This also lets
-- the Storage upload policy prove that a photo belongs to a real pending post.
drop policy if exists "authors read own media submissions" on public.stories;
create policy "authors read own media submissions"
on public.stories for select to authenticated
using (
  media_status in ('pending', 'rejected')
  and exists (
    select 1 from public.story_authors sa
    where sa.story_id = stories.id
      and sa.author_id = (select auth.uid())
  )
);

drop policy if exists "moderators read reviewable stories" on public.stories;
create policy "moderators read reviewable stories"
on public.stories for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_moderator
  )
);

-- Keep Data API privileges narrow: members may supply only the photo path;
-- moderation fields remain trigger/RPC controlled.
grant select (photo_path, media_status) on public.stories to anon, authenticated;
grant insert (photo_path) on public.stories to authenticated;

-- Private bucket. Public visitors receive short-lived signed URLs only after
-- a story has been approved. Uploads are re-encoded client-side and capped.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'story-media', 'story-media', false, 5242880,
  array['image/webp', 'image/jpeg']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "story media upload for pending owner" on storage.objects;
create policy "story media upload for pending owner"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'story-media'
  and name ~ '^uploads/[0-9a-f-]{36}\.(webp|jpg)$'
  and exists (
    select 1
    from public.stories s
    join public.story_authors sa on sa.story_id = s.id
    where s.photo_path = name
      and s.media_status = 'pending'
      and sa.author_id = (select auth.uid())
  )
);

drop policy if exists "story media approved owner or moderator read" on storage.objects;
create policy "story media approved owner or moderator read"
on storage.objects for select to public
using (
  bucket_id = 'story-media'
  and (
    owner_id = (select auth.uid())::text
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.is_moderator
    )
    or exists (
      select 1 from public.stories s
      where s.photo_path = name
        and s.state = 'live'
        and s.media_status = 'approved'
    )
  )
);

drop policy if exists "story media owner delete" on storage.objects;
create policy "story media owner delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'story-media'
  and owner_id = (select auth.uid())::text
);

-- In-app moderation decisions are visible only to their recipient. Inserts
-- happen only inside the locked-down review function below.
create table if not exists public.media_review_notifications (
  id bigint generated by default as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  story_id uuid references public.stories(id) on delete set null,
  decision text not null check (decision in ('rejected')),
  message text not null,
  story_excerpt text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists media_review_notifications_user_created_idx
  on public.media_review_notifications (user_id, created_at desc);

alter table public.media_review_notifications enable row level security;
drop policy if exists "members read own media review notifications" on public.media_review_notifications;
create policy "members read own media review notifications"
on public.media_review_notifications for select to authenticated
using (user_id = (select auth.uid()));

revoke all on public.media_review_notifications from anon, authenticated;
grant select on public.media_review_notifications to authenticated;

create or replace function public.review_media_story(
  p_story_id uuid,
  p_decision text,
  p_reason text default null
)
returns table (decision text, recipient_id uuid, photo_path text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_story public.stories%rowtype;
  v_recipient uuid;
  v_reason text;
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_moderator
  ) then
    raise exception using message = 'not_authorized';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception using message = 'invalid_media_decision';
  end if;

  select * into v_story
  from public.stories s
  where s.id = p_story_id and s.media_status = 'pending'
  for update;

  if not found then
    raise exception using message = 'media_story_not_pending';
  end if;

  select sa.author_id into v_recipient
  from public.story_authors sa
  where sa.story_id = p_story_id;

  if p_decision = 'approved' then
    update public.stories
    set state = 'live',
        media_status = 'approved',
        media_reviewed_at = now(),
        media_reviewed_by = (select auth.uid()),
        media_rejection_reason = null
    where id = p_story_id;
  else
    v_reason := nullif(left(btrim(coalesce(p_reason, '')), 240), '');
    update public.stories
    set state = 'removed',
        media_status = 'rejected',
        media_reviewed_at = now(),
        media_reviewed_by = (select auth.uid()),
        media_rejection_reason = v_reason
    where id = p_story_id;

    if v_recipient is not null then
      insert into public.media_review_notifications (
        user_id, story_id, decision, message, story_excerpt
      ) values (
        v_recipient,
        p_story_id,
        'rejected',
        'Your photo or GIF post wasn''t approved, so it wasn''t published.',
        left(v_story.text, 100)
      );
    end if;
  end if;

  return query select p_decision, v_recipient, v_story.photo_path;
end;
$$;

revoke all on function public.review_media_story(uuid, text, text) from public, anon;
grant execute on function public.review_media_story(uuid, text, text) to authenticated;

-- Polls attached to a pending media story are private too. Route ownership
-- through story_authors so fully anonymous authors can still add their poll.
drop policy if exists "read poll options" on public.poll_options;
create policy "read poll options"
on public.poll_options for select to public
using (
  exists (
    select 1 from public.stories s where s.id = poll_options.story_id
  )
);

drop policy if exists "author inserts options" on public.poll_options;
create policy "author inserts options"
on public.poll_options for insert to authenticated
with check (
  exists (
    select 1 from public.story_authors sa
    where sa.story_id = poll_options.story_id
      and sa.author_id = (select auth.uid())
  )
);

-- Pending/rejected posts should not consume a public post badge count. Approval
-- increments it exactly once; a later takedown decrements it exactly once.
create or replace function public.sync_post_count()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  if tg_op = 'INSERT' and new.author_id is not null and new.state = 'live' then
    update profiles set post_count = post_count + 1 where id = new.author_id;
  elsif tg_op = 'UPDATE' and old.author_id is not null
        and old.state is distinct from new.state then
    if old.state <> 'live' and new.state = 'live' then
      update profiles set post_count = post_count + 1 where id = new.author_id;
    elsif old.state = 'live' and new.state <> 'live' then
      update profiles set post_count = greatest(0, post_count - 1) where id = old.author_id;
    end if;
  elsif tg_op = 'DELETE' and old.author_id is not null and old.state = 'live' then
    update profiles set post_count = greatest(0, post_count - 1) where id = old.author_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_post_count on public.stories;
create trigger trg_sync_post_count
after insert or delete or update of state on public.stories
for each row execute function public.sync_post_count();

-- Rejected media no longer counts against the member's daily posting limit.
create or replace function public.enforce_daily_story_limit()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare cnt int;
begin
  select count(*) into cnt
  from stories s join story_authors sa on sa.story_id = s.id
  where sa.author_id = auth.uid()
    and s.created_at >= app_day_start()
    and s.state <> 'removed';
  if cnt >= 5 then
    raise exception using message = 'daily_story_limit';
  end if;
  return new;
end;
$$;

notify pgrst, 'reload schema';
