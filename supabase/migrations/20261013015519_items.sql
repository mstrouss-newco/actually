create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  gmail_id text not null,
  store text not null,
  name text not null,
  brand text,
  size text,
  color text,
  price numeric(10,2),
  quantity int not null default 1,
  image_url text,
  category text not null default 'other' check (category in ('tops','bottoms','dresses','outerwear','shoes','bags','accessories','beauty','home','other')),
  ordered_at timestamptz not null,
  pick text check (pick in ('keep','sell','private')),
  created_at timestamptz not null default now(),
  unique (user_id, gmail_id, name, size)
);
create index items_user_ordered on public.items (user_id, ordered_at desc);

alter table public.items enable row level security;
create policy "Read own items" on public.items for select to authenticated using ((select auth.uid()) = user_id);
create policy "Update own items" on public.items for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own items" on public.items for delete to authenticated using ((select auth.uid()) = user_id);
-- Inserts come only from the read-order function, which checks who is signed in.

-- Marks which order emails the AI has already read, so nothing is read twice.
alter table public.orders add column items_read boolean not null default false;
