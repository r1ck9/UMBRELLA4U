-- Track which weekly prompt a story answers. Run once in Supabase SQL Editor.
-- Safe to re-run. prompt_id holds the WEEKLY_PROMPT.key (e.g. '2026-w27') the
-- story was posted against, or NULL for a normal post.
alter table stories add column if not exists prompt_id text;
create index if not exists stories_prompt on stories(prompt_id);
