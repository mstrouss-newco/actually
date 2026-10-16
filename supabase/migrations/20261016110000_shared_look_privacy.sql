-- Shared looks only carry the layout of pieces that are hers and still in her closet,
-- so ids of kids', partner's, hidden or returned pieces never leave the database.
create or replace function public.outfit_public(o public.outfits)
 returns json
 language sql
 stable security definer
 set search_path to ''
as $function$
  with ok as (
    select i.* from public.items i
    where i.user_id = o.user_id and i.returned_at is null and not i.hidden and coalesce(i.for_whom, 'me') = 'me'
      and i.id::text in (select e->>'id' from jsonb_array_elements(o.layout) e)
  )
  select json_build_object(
    'id', o.id, 'name', o.name, 'occasion', o.occasion, 'note', o.note, 'shared_at', o.shared_at,
    'layout', coalesce((select jsonb_agg(e) from jsonb_array_elements(o.layout) e where e->>'id' in (select ok.id::text from ok)), '[]'::jsonb),
    'pieces', coalesce((select json_agg(json_build_object('id', ok.id, 'brand', ok.brand, 'store', ok.store, 'name', ok.name, 'image_url', ok.image_url, 'category', ok.category, 'product_url', ok.product_url, 'store_site', ok.store_site)) from ok), '[]'::json)
  );
$function$;

create or replace function public.item_sites(ids uuid[])
 returns table(item_id uuid, store_site text)
 language sql
 stable security definer
 set search_path to ''
as $function$
  select i.id, i.store_site from public.items i
  where i.id = any(ids) and i.store_site is not null and (
    i.user_id = (select auth.uid())
    or (i.returned_at is null and not i.hidden and coalesce(i.for_whom, 'me') = 'me' and (
      i.pick = 'share'
      or exists (select 1 from public.outfits o where o.user_id = i.user_id and o.shared and o.layout @> jsonb_build_array(jsonb_build_object('id', i.id::text))))));
$function$;
