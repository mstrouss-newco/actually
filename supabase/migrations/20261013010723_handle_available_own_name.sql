create or replace function public.handle_available(name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (
    select 1 from public.profiles
    where handle = lower(name) and id is distinct from (select auth.uid())
  );
$$;
