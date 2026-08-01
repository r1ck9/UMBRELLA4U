-- GIPHY-only media for Haven stories. Safe to run more than once.
-- The browser stores only a GIPHY ID; arbitrary image URLs cannot be embedded.

alter table public.stories
  add column if not exists giphy_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.stories'::regclass
      and conname = 'stories_giphy_id_format'
  ) then
    alter table public.stories
      add constraint stories_giphy_id_format
      check (giphy_id is null or giphy_id ~ '^[A-Za-z0-9_-]{1,80}$');
  end if;
end $$;

-- Keep private seeding fields out of the Data API while exposing the GIF ID.
revoke select on table public.stories from anon, authenticated;
grant select (
  id, author_id, author_name, anonymous, text, intent, category,
  content_warning, giphy_id, umbrella_count, state, created_at,
  off_topic_count, view_count, boost_count, prompt_id, hug_count,
  weather, channel_id
) on table public.stories to anon, authenticated;

-- Authenticated users may set content fields only; server-owned counters and
-- moderation fields continue to use their protected defaults.
revoke insert on table public.stories from anon, authenticated;
grant insert (
  text, intent, category, anonymous, weather, prompt_id, channel_id,
  content_warning, giphy_id
) on table public.stories to authenticated;

notify pgrst, 'reload schema';
