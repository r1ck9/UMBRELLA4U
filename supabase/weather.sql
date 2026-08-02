-- ============================================================
--  Post weather: the poster picks how they're feeling when they post, and the
--  umbrellas people send clear it toward sunny. The heavier the weather, the
--  more umbrellas it takes. Run AFTER bot_engine.sql (updates on_new_story).
--  Safe to re-run.
--
--  weather: 0 heavy rain · 1 steady rain · 2 rain · 3 light rain · 4 cloudy
--           5 brightening · 6 partly sunny · 7 mostly sunny · 8 sunny
--           (null = older post, treated as rain)
-- ============================================================
alter table public.stories add column if not exists weather smallint;

-- Move the original five choices to every second point on the new nine-point
-- scale. The constraint doubles as an idempotency marker on later re-runs.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'stories_weather_nine_step_check'
      and conrelid = 'public.stories'::regclass
  ) then
    update public.stories set weather = weather * 2 where weather between 0 and 4;
    alter table public.stories add constraint stories_weather_nine_step_check
      check (weather between 0 and 8);
  end if;
end $$;

-- New posts: set the drip target from the chosen weather, so the bots clear
-- each post to exactly "sunny" for how heavy the poster said it was.
create or replace function public.on_new_story() returns trigger
language plpgsql security definer set search_path = '' as $$
declare bot_author boolean;
begin
  if coalesce(new.seed, false) then return null; end if;
  if new.author_id is not null then
    select coalesce(is_bot, false) into bot_author from public.profiles where id = new.author_id;
    if bot_author then return null; end if;
  end if;

  -- umbrellas needed to reach sunny, by chosen weather
  update public.stories set umbrella_target =
    case coalesce(new.weather, 2)
      when 0 then 50 when 1 then 43 when 2 then 35 when 3 then 29 when 4 then 22
      when 5 then 17 when 6 then 12 when 7 then 10 when 8 then 8 else 35 end
   where id = new.id and umbrella_target is null;

  -- head start so a fresh post never sits empty
  insert into public.umbrellas (story_id, user_id, created_at)
  select new.id, p.id, now() - (random() * interval '2 minutes')
  from public.profiles p
  where p.is_bot and (new.author_id is null or p.id <> new.author_id)
  order by random()
  limit (3 + floor(random() * 4)::int)
  on conflict (story_id, user_id) do nothing;

  insert into public.owner_reply_queue (story_id) values (new.id) on conflict do nothing;
  return null;
end $$;
revoke all on function public.on_new_story() from public, anon, authenticated;
drop trigger if exists trg_on_new_story on public.stories;
create trigger trg_on_new_story after insert on public.stories
  for each row execute function public.on_new_story();
