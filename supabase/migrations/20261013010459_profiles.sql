create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique check (handle ~ '^[a-z0-9][a-z0-9.]{1,28}[a-z0-9]$' and handle !~ '\.\.'),
  goals jsonb not null default '{"org": true, "earn": false, "share": false}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Create own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "Update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Lets the sign-up screen check a name without seeing anyone's data.
create function public.handle_available(name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.profiles where handle = lower(name));
$$;
revoke all on function public.handle_available(text) from public;
grant execute on function public.handle_available(text) to anon, authenticated;
