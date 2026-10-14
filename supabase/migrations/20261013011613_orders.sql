create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  gmail_id text not null,
  store text not null,
  store_domain text,
  subject text,
  kind text not null check (kind in ('order', 'shipping', 'delivered', 'return', 'refund', 'receipt', 'other')),
  order_no text,
  amount numeric(10,2),
  sent_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id, gmail_id)
);
create index orders_user_sent on public.orders (user_id, sent_at desc);

alter table public.orders enable row level security;
create policy "Read own orders" on public.orders for select to authenticated using ((select auth.uid()) = user_id);
create policy "Add own orders" on public.orders for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own orders" on public.orders for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own orders" on public.orders for delete to authenticated using ((select auth.uid()) = user_id);
