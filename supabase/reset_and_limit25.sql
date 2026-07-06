-- Run in Supabase SQL Editor. Resets all umbrellas AND raises the daily limit to 25.

-- 1) wipe umbrellas + zero the counts
delete from umbrellas;
update stories set umbrella_count = 0;

-- 2) raise the daily limit to 25
create or replace function enforce_daily_umbrella_limit()
returns trigger language plpgsql as $$
declare cnt int;
begin
  select count(*) into cnt from umbrellas
  where user_id = auth.uid() and created_at >= date_trunc('day', now());
  if cnt >= 25 then
    raise exception using message = 'daily_umbrella_limit';
  end if;
  return new;
end $$;
