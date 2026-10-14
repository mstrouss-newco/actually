-- Turns a public handle into the id needed to follow someone. Signed-in only.
create function public.profile_id(name text) returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.profiles where handle = lower(name);
$$;
revoke all on function public.profile_id(text) from public;
grant execute on function public.profile_id(text) to authenticated;
