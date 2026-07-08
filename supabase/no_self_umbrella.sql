-- Stop people opening an umbrella on their own story. Run once in Supabase.
-- Safe to re-run. Enforced in the database so it can't be bypassed from the browser.
create or replace function prevent_self_umbrella() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from stories s where s.id = new.story_id and s.author_id = new.user_id) then
    raise exception using message = 'self_umbrella';
  end if;
  return new;
end $$;
drop trigger if exists trg_no_self_umbrella on umbrellas;
create trigger trg_no_self_umbrella before insert on umbrellas
  for each row execute function prevent_self_umbrella();
