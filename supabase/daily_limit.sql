-- NOTE: the day boundary here is SUPERSEDED by day_boundary_tz.sql
-- (America/Vancouver instead of UTC). Run that after this one.
--
-- Daily umbrella limit — run this once in Supabase (SQL Editor).
-- Stops anyone opening more than 5 umbrellas per day, enforced in the database
-- so it can't be bypassed from the browser. Change the 5 to adjust the limit
-- (and keep web/lib/config.js in sync).

create or replace function enforce_daily_umbrella_limit()
returns trigger language plpgsql as $$
declare cnt int;
begin
  select count(*) into cnt
  from umbrellas
  where user_id = auth.uid()
    and created_at >= date_trunc('day', now());   -- resets at UTC midnight

  if cnt >= 5 then
    raise exception using message = 'daily_umbrella_limit';
  end if;

  return new;
end $$;

drop trigger if exists trg_daily_limit on umbrellas;
create trigger trg_daily_limit before insert on umbrellas
  for each row execute function enforce_daily_umbrella_limit();
