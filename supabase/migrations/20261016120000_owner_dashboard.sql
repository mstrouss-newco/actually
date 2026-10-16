-- Owner dashboard: who's an owner, simple funnel events, expenses, and an action log.
create table if not exists public.admins (email text primary key);
alter table public.admins enable row level security; -- no policies: server only
insert into public.admins (email) values ('mstrouss@gmail.com') on conflict do nothing;

create or replace function public.is_admin()
 returns boolean
 language sql
 stable security definer
 set search_path to ''
as $function$
  select exists (select 1 from public.admins a where a.email = lower(coalesce((select auth.jwt()) ->> 'email', '')));
$function$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Funnel steps only. Never email content, never product details.
create table if not exists public.events (
  id bigserial primary key,
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,
  visitor text check (visitor is null or char_length(visitor) <= 40),
  name text not null check (name in ('welcome', 'claimed', 'goal', 'gmail_connected', 'closet_ready', 'first_share', 'first_outfit', 'signed_in', 'app_open')),
  created_at timestamptz not null default now()
);
create index if not exists events_name_idx on public.events(name, created_at desc);
alter table public.events enable row level security;
create policy "Log own steps" on public.events for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  month date not null default date_trunc('month', now())::date,
  vendor text not null check (char_length(vendor) between 1 and 60),
  amount numeric(10,2) not null check (amount >= 0 and amount < 1000000),
  monthly boolean not null default true,
  note text check (note is null or char_length(note) <= 200),
  created_at timestamptz not null default now()
);
alter table public.expenses enable row level security;
create policy "Owners manage expenses" on public.expenses for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create table if not exists public.admin_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  by_email text not null,
  action text not null,
  target text
);
alter table public.admin_log enable row level security;
create policy "Owners read the log" on public.admin_log for select to authenticated using ((select public.is_admin()));

-- Everything the dashboard shows, in one call. Owners only.
create or replace function public.admin_stats()
 returns json
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare out json;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  with weeks as (select generate_series(date_trunc('week', now()) - interval '7 weeks', date_trunc('week', now()), interval '1 week') as w)
  select json_build_object(
    'users', (select count(*) from public.profiles),
    'users_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'gmail', (select count(*) from public.gmail_tokens),
    'imported', (select count(*) from public.profiles where last_import_at is not null),
    'active_7d', (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
    'active_30d', (select count(*) from auth.users where last_sign_in_at > now() - interval '30 days'),
    'open_7d', (select count(distinct user_id) from public.events where name = 'app_open' and created_at > now() - interval '7 days'),
    'orders', (select count(*) from public.orders),
    'items', (select count(*) from public.items),
    'shared', (select count(*) from public.items where pick = 'share' and returned_at is null),
    'sharers', (select count(distinct user_id) from public.items where pick = 'share'),
    'loves', (select count(*) from public.loves),
    'outfits', (select count(*) from public.outfits),
    'outfits_shared', (select count(*) from public.outfits where shared),
    'follows', (select count(*) from public.follows),
    'brand_follows', (select count(*) from public.brand_follows),
    'funnel', json_build_array(
      json_build_object('step', 'Opened the welcome', 'n', (select count(distinct coalesce(user_id::text, visitor)) from public.events where name = 'welcome')),
      json_build_object('step', 'Picked a name', 'n', (select count(distinct coalesce(user_id::text, visitor)) from public.events where name = 'claimed')),
      json_build_object('step', 'Signed up', 'n', (select count(*) from public.profiles)),
      json_build_object('step', 'Connected Gmail', 'n', (select count(*) from public.gmail_tokens)),
      json_build_object('step', 'Closet filled', 'n', (select count(distinct user_id) from public.items)),
      json_build_object('step', 'Shared a piece', 'n', (select count(distinct user_id) from public.items where pick = 'share')),
      json_build_object('step', 'Made an outfit', 'n', (select count(distinct user_id) from public.outfits))
    ),
    'weekly', (select json_agg(json_build_object(
        'week', to_char(w, 'Mon DD'),
        'signups', (select count(*) from public.profiles p where p.created_at >= w and p.created_at < w + interval '1 week'),
        'shares', (select count(*) from public.items i where i.shared_at >= w and i.shared_at < w + interval '1 week'),
        'loves', (select count(*) from public.loves l where l.created_at >= w and l.created_at < w + interval '1 week'),
        'outfits', (select count(*) from public.outfits o where o.created_at >= w and o.created_at < w + interval '1 week'),
        'emails_read', (select count(*) from public.orders o where o.created_at >= w and o.created_at < w + interval '1 week')
      ) order by w) from weeks),
    'top_brands', (select coalesce(json_agg(x), '[]'::json) from (
        select coalesce(i.brand, i.store) as brand, count(*) as loves from public.loves l join public.items i on i.id = l.item_id
        group by 1 order by 2 desc limit 8) x),
    'ai_30d', json_build_object(
        'emails_screened', (select count(*) from public.orders where created_at > now() - interval '30 days'),
        'orders_read', (select count(*) from public.orders where items_read and created_at > now() - interval '30 days'),
        'cutouts', (select count(*) from storage.objects where bucket_id = 'cutouts' and created_at > now() - interval '30 days')),
    'expenses', (select coalesce(json_agg(e order by e.month desc, e.vendor), '[]'::json) from public.expenses e),
    'log', (select coalesce(json_agg(g order by g.at desc), '[]'::json) from (select * from public.admin_log order by at desc limit 20) g)
  ) into out;
  return out;
end;
$function$;
revoke execute on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;

-- People list for the dashboard. Owners only. No email content, just counts.
create or replace function public.admin_users(q text default '')
 returns table(id uuid, email text, handle text, joined timestamptz, last_seen timestamptz, gmail boolean, orders bigint, pieces bigint, shared bigint)
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
  select u.id, u.email::text, p.handle, u.created_at, u.last_sign_in_at,
    exists (select 1 from public.gmail_tokens g where g.user_id = u.id),
    (select count(*) from public.orders o where o.user_id = u.id),
    (select count(*) from public.items i where i.user_id = u.id),
    (select count(*) from public.items i where i.user_id = u.id and i.pick = 'share')
  from auth.users u left join public.profiles p on p.id = u.id
  where q = '' or u.email ilike '%' || q || '%' or p.handle ilike '%' || q || '%'
  order by u.created_at desc limit 200;
end;
$function$;
revoke execute on function public.admin_users(text) from public, anon;
grant execute on function public.admin_users(text) to authenticated;
