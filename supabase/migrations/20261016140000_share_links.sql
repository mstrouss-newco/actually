-- Share links: a look or a piece she chooses to share by link gets a public page.
-- Only her own pieces (never kids, partner or someone else's, hidden or sent back), and only
-- photo, brand, name, her note and the store link. Never price, size or order details.
alter table public.outfits add column if not exists link_shared boolean not null default false;
alter table public.items add column if not exists link_shared boolean not null default false;

create or replace function public.public_look(look uuid)
 returns json
 language sql
 stable security definer
 set search_path to ''
as $function$
  select (public.outfit_public(o)::jsonb || jsonb_build_object('handle', p.handle))::json
  from public.outfits o join public.profiles p on p.id = o.user_id
  where o.id = look and o.link_shared;
$function$;

create or replace function public.public_piece(piece uuid)
 returns json
 language sql
 stable security definer
 set search_path to ''
as $function$
  select json_build_object('id', i.id, 'brand', i.brand, 'store', i.store, 'name', i.name, 'image_url', i.image_url,
    'category', i.category, 'product_url', i.product_url, 'store_site', i.store_site, 'note', i.note, 'handle', p.handle)
  from public.items i join public.profiles p on p.id = i.user_id
  where i.id = piece and i.link_shared and i.returned_at is null and not i.hidden and coalesce(i.for_whom, 'me') = 'me';
$function$;

grant execute on function public.public_look(uuid) to anon, authenticated;
grant execute on function public.public_piece(uuid) to anon, authenticated;
