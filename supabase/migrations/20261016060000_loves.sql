-- Hearts on friends' shared pieces. She sees her own list (Saved); owners see counts only, never who.
create table if not exists public.loves (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
create index if not exists loves_item_id_idx on public.loves(item_id);
alter table public.loves enable row level security;
create policy "See own loves" on public.loves for select to authenticated using (user_id = (select auth.uid()));

-- Love or unlove a piece someone else shared. Returns the new count.
create or replace function public.set_love(item uuid, loved boolean)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if loved then
    insert into public.loves (user_id, item_id)
    select (select auth.uid()), i.id from public.items i
    where i.id = item and i.pick = 'share' and i.returned_at is null and i.user_id <> (select auth.uid())
    on conflict do nothing;
  else
    delete from public.loves where user_id = (select auth.uid()) and item_id = item;
  end if;
  return (select count(*) from public.loves where item_id = item);
end;
$function$;

-- Counts for shared pieces, plus whether she loved each one.
create or replace function public.love_state(ids uuid[])
 returns table(item_id uuid, loves integer, mine boolean)
 language sql
 stable security definer
 set search_path to ''
as $function$
  select i.id, count(l.user_id)::int, coalesce(bool_or(l.user_id = (select auth.uid())), false)
  from public.items i left join public.loves l on l.item_id = i.id
  where i.id = any(ids) and i.pick = 'share' and i.returned_at is null
  group by i.id;
$function$;

-- Her Saved list: pieces she loved that are still shared.
create or replace function public.saved_pieces()
 returns table(handle text, id uuid, brand text, store text, name text, image_url text, category text, shared_at timestamp with time zone, product_url text, loved_at timestamp with time zone)
 language sql
 stable security definer
 set search_path to ''
as $function$
  select p.handle, i.id, i.brand, i.store, i.name, i.image_url, i.category, i.shared_at, i.product_url, l.created_at
  from public.loves l
  join public.items i on i.id = l.item_id and i.pick = 'share' and i.returned_at is null
  join public.profiles p on p.id = i.user_id
  where l.user_id = (select auth.uid()) and p.handle is not null
  order by l.created_at desc limit 300;
$function$;

revoke execute on function public.set_love(uuid, boolean), public.love_state(uuid[]), public.saved_pieces() from public, anon;
grant execute on function public.set_love(uuid, boolean), public.love_state(uuid[]), public.saved_pieces() to authenticated;
