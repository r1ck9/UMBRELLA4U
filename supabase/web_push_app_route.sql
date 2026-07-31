-- Umbrella / Haven web push without pg_net.
--
-- Run this in Supabase if push subscriptions are missing or if you previously
-- disabled the pg_net trigger to fix posting. Push delivery is now handled by
-- the Next.js route /api/push/umbrella after an umbrella row is saved, so story
-- posting and umbrella opening do not depend on database HTTP extensions.

create table if not exists public.web_push_subs (
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  sub jsonb not null,
  updated_at timestamptz default now()
);

create index if not exists web_push_subs_user on public.web_push_subs(user_id);

alter table public.web_push_subs enable row level security;

drop policy if exists "own web sub read" on public.web_push_subs;
create policy "own web sub read" on public.web_push_subs for select
  using (auth.uid() = user_id);

drop policy if exists "own web sub del" on public.web_push_subs;
create policy "own web sub del" on public.web_push_subs for delete
  using (auth.uid() = user_id);

create or replace function public.save_web_push_sub(sub jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.web_push_subs(endpoint, user_id, sub, updated_at)
  values (sub->>'endpoint', auth.uid(), sub, now())
  on conflict (endpoint) do update set
    user_id = excluded.user_id,
    sub = excluded.sub,
    updated_at = now();
end $$;

grant execute on function public.save_web_push_sub(jsonb) to authenticated;

create or replace function public.delete_web_push_sub(ep text) returns void
language sql security definer set search_path = public as $$
  delete from public.web_push_subs
  where endpoint = ep and user_id = auth.uid();
$$;

grant execute on function public.delete_web_push_sub(text) to authenticated;

drop trigger if exists trg_push_umbrella on public.umbrellas;
drop function if exists public.notify_push_on_umbrella();
