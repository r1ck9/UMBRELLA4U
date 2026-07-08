-- Screen umbrella NOTES (the one-line replies) the same way as stories.
-- Run AFTER profile_filter.sql and pii_filter.sql (reuses their helpers). Safe to re-run.
create or replace function screen_umbrella_note() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.note is not null and new.note <> '' then
    if contains_blocked(new.note) then
      raise exception using message = 'blocked_content';
    end if;
    if contains_personal_info(new.note) then
      raise exception using message = 'personal_info';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_screen_umbrella on umbrellas;
create trigger trg_screen_umbrella before insert on umbrellas
  for each row execute function screen_umbrella_note();
