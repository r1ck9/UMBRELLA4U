-- Anti-doxxing: block shared contact info. Run AFTER profile_filter.sql
-- (reuses contains_blocked). Safe to re-run.
--
-- We hard-block EMAIL ADDRESSES in stories and profiles, because an email is a
-- near-certain doxxing signal and almost never legitimate here. We deliberately
-- do NOT hard-block phone numbers, because people legitimately share crisis-line
-- numbers (e.g. 1-800-668-6868). Phones/socials/names are handled by the
-- composer reminder, the AI screen, and human moderators.
create or replace function contains_personal_info(t text) returns boolean
language plpgsql immutable set search_path = public as $$
begin
  if t is null or t = '' then return false; end if;
  if t ~* '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' then return true; end if; -- email address
  return false;
end $$;

create or replace function screen_story() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if contains_blocked(new.text) then
    raise exception using message = 'blocked_content';
  end if;
  if contains_personal_info(new.text) then
    raise exception using message = 'personal_info';
  end if;
  return new;
end $$;
drop trigger if exists trg_screen_story on stories;
create trigger trg_screen_story before insert on stories
  for each row execute function screen_story();

create or replace function screen_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if contains_blocked(new.username) or contains_blocked(new.display_name)
     or contains_blocked(new.pronouns) or contains_blocked(new.status_weather)
     or contains_blocked(new.about_me)
     or (new.tags is not null and contains_blocked(array_to_string(new.tags, ' '))) then
    raise exception using message = 'blocked_content';
  end if;
  if contains_personal_info(new.about_me) or contains_personal_info(new.status_weather) then
    raise exception using message = 'personal_info';
  end if;
  return new;
end $$;
drop trigger if exists trg_screen_profile on profiles;
create trigger trg_screen_profile before insert or update on profiles
  for each row execute function screen_profile();
