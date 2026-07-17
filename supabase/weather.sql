-- ============================================================
--  Post weather: the poster picks how they're feeling when they post, and the
--  umbrellas people send clear it toward sunny. The heavier the weather, the
--  more umbrellas it takes. Run AFTER bot_engine.sql (updates on_new_story).
--  Safe to re-run.
--
--  weather: 0 heavy rain · 1 rain · 2 cloudy · 3 partly sunny · 4 sunny
--           (null = older post, treated as rain)
-- ============================================================
alter table stories add column if not exists weather smallint;

-- New posts: set the drip target from the chosen weather, so the bots clear
-- each post to exactly "sunny" for how heavy the poster said it was.
create or replace function on_new_story() returns trigger
language plpgsql security definer set search_path = public as $$
declare bot_author boolean;
begin
  if coalesce(new.seed, false) then return null; end if;
  if new.author_id is not null then
    select coalesce(is_bot, false) into bot_author from profiles where id = new.author_id;
    if bot_author then return null; end if;
  end if;

  -- umbrellas needed to reach sunny, by chosen weather
  update stories set umbrella_target =
    case coalesce(new.weather, 1)
      when 0 then 50 when 1 then 35 when 2 then 22 when 3 then 12 when 4 then 8 else 35 end
   where id = new.id and umbrella_target is null;

  -- head start so a fresh post never sits empty
  insert into umbrellas (story_id, user_id, created_at)
  select new.id, p.id, now() - (random() * interval '2 minutes')
  from profiles p
  where p.is_bot and (new.author_id is null or p.id <> new.author_id)
  order by random()
  limit (3 + floor(random() * 4)::int)
  on conflict (story_id, user_id) do nothing;

  insert into owner_reply_queue (story_id) values (new.id) on conflict do nothing;
  return null;
end $$;
drop trigger if exists trg_on_new_story on stories;
create trigger trg_on_new_story after insert on stories
  for each row execute function on_new_story();
