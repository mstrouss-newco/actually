-- Outfits: a collage of her own pieces. Private unless she shares it.
create table if not exists public.outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null default 'New outfit' check (char_length(name) between 1 and 60),
  occasion text check (occasion is null or char_length(occasion) <= 30),
  note text check (note is null or char_length(note) <= 140),
  layout jsonb not null default '[]'::jsonb check (jsonb_typeof(layout) = 'array' and jsonb_array_length(layout) <= 12),
  shared boolean not null default false,
  shared_at timestamptz,
  worn integer not null default 0,
  last_worn date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists outfits_user_idx on public.outfits(user_id, updated_at desc);
alter table public.outfits enable row level security;
create policy "See own outfits" on public.outfits for select to authenticated using (user_id = (select auth.uid()));
create policy "Add own outfits" on public.outfits for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Change own outfits" on public.outfits for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Remove own outfits" on public.outfits for delete to authenticated using (user_id = (select auth.uid()));

-- A shared outfit as others see it: layout plus only her own pieces that are hers (never kids, partner or someone else),
-- not sent back. Photo, brand, name and store link only.
create or replace function public.outfit_public(o public.outfits)
 returns json
 language sql
 stable security definer
 set search_path to ''
as $function$
  select json_build_object(
    'id', o.id, 'name', o.name, 'occasion', o.occasion, 'note', o.note, 'layout', o.layout, 'shared_at', o.shared_at,
    'pieces', coalesce((select json_agg(json_build_object('id', i.id, 'brand', i.brand, 'store', i.store, 'name', i.name, 'image_url', i.image_url, 'category', i.category, 'product_url', i.product_url))
      from public.items i
      where i.user_id = o.user_id and i.returned_at is null and not i.hidden and coalesce(i.for_whom, 'me') = 'me'
        and i.id::text in (select e->>'id' from jsonb_array_elements(o.layout) e)), '[]'::json)
  );
$function$;
revoke execute on function public.outfit_public(public.outfits) from public, anon, authenticated;

-- Looks shared by people she follows.
create or replace function public.friends_outfits()
 returns json
 language sql
 stable security definer
 set search_path to ''
as $function$
  select coalesce(json_agg(y.j order by y.at desc), '[]'::json) from (
    select public.outfit_public(o)::jsonb || jsonb_build_object('handle', p.handle) as j, o.shared_at as at
    from public.follows f
    join public.outfits o on o.user_id = f.followee_id and o.shared
    join public.profiles p on p.id = o.user_id
    where f.follower_id = (select auth.uid()) and p.handle is not null
    order by o.shared_at desc limit 100
  ) y;
$function$;
revoke execute on function public.friends_outfits() from public, anon;
grant execute on function public.friends_outfits() to authenticated;

-- Her page now includes the looks she shared.
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
      from public.items i where i.user_id = p.id and i.pick = 'share' and i.returned_at is null order by i.shared_at desc limit 200) x), '[]'::json),
    'outfits', coalesce((select json_agg(public.outfit_public(o) order by o.shared_at desc) from public.outfits o where o.user_id = p.id and o.shared), '[]'::json)
  )
  from public.profiles p where p.handle = lower(name);
$function$;
