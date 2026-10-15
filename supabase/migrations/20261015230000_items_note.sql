-- A short note she writes about a piece she shares ("Size down one"). Shown on her feed.
alter table public.items add column if not exists note text check (note is null or char_length(note) <= 140);

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
      select i.id, i.brand, i.store, i.name, i.image_url, i.category, i.shared_at, i.note
      from public.items i where i.user_id = p.id and i.pick = 'share' order by i.shared_at desc limit 200) x), '[]'::json)
  )
  from public.profiles p where p.handle = lower(name);
$function$;
