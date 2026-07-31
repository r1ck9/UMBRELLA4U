-- Definitive fallback for projects where an old push/automation trigger still
-- references the unavailable `net` schema. Run once in the live Supabase DB.
-- Story posting stays enabled; automatic starter umbrellas are paused.

drop trigger if exists trg_push_umbrella on public.umbrellas;
drop function if exists public.notify_push_on_umbrella();
drop trigger if exists trg_on_new_story on public.stories;
