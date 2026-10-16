-- Each piece's page on the store's site (cleaned, nothing after the "?"), shown on feeds and the closet.
alter table public.items add column if not exists product_url text;

create or replace function public.profile_page(name text)
 returns json
 language sql
 stable security definer
 set search_path to ''
as $function$
  select json_build_object(
    'handle', p.handle,
    'is_me', p.id = (select auth.uid()),
    'i_follow', exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.followee_id = p.id),
    'followers', (select count(*) from public.follows f where f.followee_id = p.id),
    'following', (select count(*) from public.follows f where f.follower_id = p.id),
    'items', coalesce((select json_agg(x order by x.shared_at desc) from (
      select i.id, i.brand, i.store, i.name, i.image_url, i.category, i.shared_at, i.note, i.product_url
      from public.items i where i.user_id = p.id and i.pick = 'share' and i.returned_at is null order by i.shared_at desc limit 200) x), '[]'::json)
  )
  from public.profiles p where p.handle = lower(name);
$function$;

-- Friends' feed with each piece's store page.
create or replace function public.friends_feed()
 returns table(handle text, id uuid, brand text, store text, name text, image_url text, category text, shared_at timestamp with time zone, product_url text)
 language sql
 stable security definer
 set search_path to ''
as $function$
  select p.handle, i.id, i.brand, i.store, i.name, i.image_url, i.category, i.shared_at, i.product_url
  from public.follows f
  join public.items i on i.user_id = f.followee_id and i.pick = 'share' and i.returned_at is null
  join public.profiles p on p.id = f.followee_id
  where f.follower_id = (select auth.uid()) and p.handle is not null
  order by i.shared_at desc nulls last limit 200;
$function$;
revoke execute on function public.friends_feed() from public, anon;
grant execute on function public.friends_feed() to authenticated;
