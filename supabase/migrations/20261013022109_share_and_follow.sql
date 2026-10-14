-- When a piece was shared, for ordering the feed.
alter table public.items add column shared_at timestamptz;
create index items_shared on public.items (user_id, shared_at desc) where pick = 'share';

create function public.items_set_shared_at() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.pick = 'share' and (old.pick is distinct from 'share') then new.shared_at := now();
  elsif new.pick is distinct from 'share' then new.shared_at := null;
  end if;
  return new;
end $$;
create trigger items_shared_at before update of pick on public.items for each row execute function public.items_set_shared_at();

create table public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followee_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index follows_followee on public.follows (followee_id);
alter table public.follows enable row level security;
create policy "See own follows" on public.follows for select to authenticated using ((select auth.uid()) in (follower_id, followee_id));
create policy "Follow" on public.follows for insert to authenticated with check ((select auth.uid()) = follower_id);
create policy "Unfollow" on public.follows for delete to authenticated using ((select auth.uid()) = follower_id);

-- Shared pieces only ever leave the database through these functions,
-- with photo, brand and name. Never price, size or order details.

create function public.profile_page(name text) returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'handle', p.handle,
    'is_me', p.id = (select auth.uid()),
    'i_follow', exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.followee_id = p.id),
    'followers', (select count(*) from public.follows f where f.followee_id = p.id),
    'following', (select count(*) from public.follows f where f.follower_id = p.id),
    'items', coalesce((select json_agg(x order by x.shared_at desc) from (
      select i.id, i.brand, i.store, i.name, i.image_url, i.category, i.shared_at
      from public.items i where i.user_id = p.id and i.pick = 'share' order by i.shared_at desc limit 200) x), '[]'::json)
  )
  from public.profiles p where p.handle = lower(name);
$$;

create function public.following_feed() returns table (handle text, id uuid, brand text, store text, name text, image_url text, category text, shared_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.handle, i.id, i.brand, i.store, i.name, i.image_url, i.category, i.shared_at
  from public.follows f
  join public.items i on i.user_id = f.followee_id and i.pick = 'share'
  join public.profiles p on p.id = f.followee_id
  where f.follower_id = (select auth.uid()) and p.handle is not null
  order by i.shared_at desc nulls last limit 200;
$$;

create function public.search_people(q text) returns table (handle text, shared bigint, i_follow boolean)
language sql stable security definer set search_path = '' as $$
  select p.handle,
    (select count(*) from public.items i where i.user_id = p.id and i.pick = 'share'),
    exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.followee_id = p.id)
  from public.profiles p
  where p.handle is not null and length(q) >= 2 and p.handle like replace(replace(lower(q), '%', ''), '_', '\_') || '%'
    and p.id <> coalesce((select auth.uid()), '00000000-0000-0000-0000-000000000000')
  order by p.handle limit 20;
$$;

-- People who share pieces from the same brands she buys, best match first.
create function public.similar_people() returns table (handle text, brands text[], shared bigint)
language sql stable security definer set search_path = '' as $$
  with mine as (
    select distinct lower(coalesce(brand, store)) b from public.items where user_id = (select auth.uid())
  )
  select p.handle, (array_agg(distinct coalesce(i.brand, i.store)))[1:3], count(distinct i.id)
  from public.items i
  join mine on mine.b = lower(coalesce(i.brand, i.store))
  join public.profiles p on p.id = i.user_id
  where i.pick = 'share' and i.user_id <> (select auth.uid()) and p.handle is not null
    and not exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.followee_id = i.user_id)
  group by p.handle
  order by count(distinct lower(coalesce(i.brand, i.store))) desc, count(distinct i.id) desc
  limit 10;
$$;

revoke all on function public.profile_page(text), public.following_feed(), public.search_people(text), public.similar_people() from public;
grant execute on function public.profile_page(text) to anon, authenticated;
grant execute on function public.following_feed(), public.search_people(text), public.similar_people() to authenticated;
