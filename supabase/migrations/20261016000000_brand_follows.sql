-- Brands she chose to follow, and what she wants to hear about from each.
create table public.brand_follows (
  user_id uuid not null references auth.users(id) on delete cascade,
  brand text not null check (char_length(brand) between 1 and 80),
  sales boolean not null default true,
  arrivals boolean not null default true,
  drops boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, brand)
);
alter table public.brand_follows enable row level security;
create policy "Own brand follows" on public.brand_follows for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- When she was shown the "Your brands" screen, so it only appears once.
alter table public.profiles add column if not exists brands_asked_at timestamptz;

-- Brands that people who follow this brand also follow. Counts only, never who.
create or replace function public.brand_suggestions(name text)
 returns table(brand text, share numeric)
 language sql stable security definer set search_path to ''
as $function$
  with fans as (select user_id from public.brand_follows where lower(brand) = lower(name)),
       total as (select greatest(count(*), 1) n from fans)
  select f.brand, round(count(*)::numeric / (select n from total), 2) as share
  from public.brand_follows f join fans using (user_id)
  where lower(f.brand) <> lower(name)
    and f.brand not in (select b.brand from public.brand_follows b where b.user_id = (select auth.uid()))
  group by f.brand
  having count(*) >= 3
  order by count(*) desc
  limit 6;
$function$;
revoke execute on function public.brand_suggestions(text) from public, anon;
grant execute on function public.brand_suggestions(text) to authenticated;
