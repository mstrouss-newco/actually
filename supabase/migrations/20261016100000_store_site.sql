-- The store's own website for each piece (e.g. jcrew.com), from the order email's sender.
-- Used to open the store's site search when we don't have the exact product page.
create or replace function public.site_of(domain text)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select case
    when d is null or d = '' then null
    when d ~ '(narvar|shopifyemail|shopify|loopreturns|happyreturns|klaviyo|sendgrid|mailchimp|gmail|outlook|yahoo|icloud|aftership|route\.com|returnly|optiturn|getredo)' then null
    else d end
  from (select regexp_replace(lower(coalesce(domain, '')), '^((e|em|email|emails|mail|mailer|news|info|shop|orders?|us|hello|notifications?|reply|t|m)\.)+', '') as d) x;
$function$;

alter table public.items add column if not exists store_site text;

-- Set from her order on the way in; only the server can change it later.
create or replace function public.set_store_site()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if tg_op = 'INSERT' then
    new.store_site := (select public.site_of(o.store_domain) from public.orders o where o.user_id = new.user_id and o.gmail_id = new.gmail_id limit 1);
  elsif coalesce(auth.role(), '') <> 'service_role' and current_user <> 'postgres' then
    new.store_site := old.store_site;
  end if;
  return new;
end;
$function$;
create trigger set_store_site before insert or update of store_site on public.items
  for each row execute function public.set_store_site();
revoke execute on function public.set_store_site() from public, anon, authenticated;

update public.items i set store_site = public.site_of(o.store_domain)
from public.orders o where o.user_id = i.user_id and o.gmail_id = i.gmail_id and i.store_site is null;

-- Store sites for pieces she can see: her own, shared ones, or ones in a shared look.
create or replace function public.item_sites(ids uuid[])
 returns table(item_id uuid, store_site text)
 language sql
 stable security definer
 set search_path to ''
as $function$
  select i.id, i.store_site from public.items i
  where i.id = any(ids) and i.store_site is not null and (
    i.user_id = (select auth.uid()) or i.pick = 'share'
    or exists (select 1 from public.outfits o where o.user_id = i.user_id and o.shared and o.layout @> jsonb_build_array(jsonb_build_object('id', i.id::text))));
$function$;
revoke execute on function public.item_sites(uuid[]) from public, anon;
grant execute on function public.item_sites(uuid[]) to authenticated;

-- Shared looks and her page include the store site too.
create or replace function public.outfit_public(o public.outfits)
 returns json
 language sql
 stable security definer
 set search_path to ''
as $function$
  select json_build_object(
    'id', o.id, 'name', o.name, 'occasion', o.occasion, 'note', o.note, 'layout', o.layout, 'shared_at', o.shared_at,
    'pieces', coalesce((select json_agg(json_build_object('id', i.id, 'brand', i.brand, 'store', i.store, 'name', i.name, 'image_url', i.image_url, 'category', i.category, 'product_url', i.product_url, 'store_site', i.store_site))
      from public.items i
      where i.user_id = o.user_id and i.returned_at is null and not i.hidden and coalesce(i.for_whom, 'me') = 'me'
        and i.id::text in (select e->>'id' from jsonb_array_elements(o.layout) e)), '[]'::json)
  );
$function$;

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
      select i.id, i.brand, i.store, i.name, i.image_url, i.category, i.shared_at, i.note, i.product_url, i.store_site
      from public.items i where i.user_id = p.id and i.pick = 'share' and i.returned_at is null order by i.shared_at desc limit 200) x), '[]'::json),
    'outfits', coalesce((select json_agg(public.outfit_public(o) order by o.shared_at desc) from public.outfits o where o.user_id = p.id and o.shared), '[]'::json)
  )
  from public.profiles p where p.handle = lower(name);
$function$;
