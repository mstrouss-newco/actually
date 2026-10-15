-- People she's connected to (they follow her, or she follows them), for "Friends already here".
-- Handle and shared count only.
create function public.my_people() returns table (handle text, shared bigint, i_follow boolean, follows_me boolean)
language sql stable security definer set search_path = '' as $$
  with me as (select (select auth.uid()) id),
  links as (
    select f.follower_id other from public.follows f, me where f.followee_id = me.id
    union
    select f.followee_id from public.follows f, me where f.follower_id = me.id
  )
  select p.handle,
    (select count(*) from public.items i where i.user_id = p.id and i.pick = 'share'),
    exists (select 1 from public.follows f, me where f.follower_id = me.id and f.followee_id = p.id),
    exists (select 1 from public.follows f, me where f.follower_id = p.id and f.followee_id = me.id)
  from links join public.profiles p on p.id = links.other
  where p.handle is not null
  order by 4 desc, 1 limit 50;
$$;
revoke all on function public.my_people() from public, anon;
grant execute on function public.my_people() to authenticated;
