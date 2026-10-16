-- Shared pages show only her first name, never her full shopping email name.
create or replace function public.public_look(look uuid)
 returns json
 language sql
 stable security definer
 set search_path to ''
as $function$
  select (public.outfit_public(o)::jsonb || jsonb_build_object('handle', initcap(regexp_replace(split_part(p.handle, '.', 1), '\d+$', ''))))::json
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
    'category', i.category, 'product_url', i.product_url, 'store_site', i.store_site, 'note', i.note,
    'handle', initcap(regexp_replace(split_part(p.handle, '.', 1), '\d+$', '')))
  from public.items i join public.profiles p on p.id = i.user_id
  where i.id = piece and i.link_shared and i.returned_at is null and not i.hidden and coalesce(i.for_whom, 'me') = 'me';
$function$;

-- Daily cap on AI styling per person, so one person can't use up the shared AI budget.
create table if not exists public.ai_runs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  kind text not null,
  created_at timestamptz not null default now()
);
create index if not exists ai_runs_user_time on public.ai_runs (user_id, created_at desc);
alter table public.ai_runs enable row level security;
