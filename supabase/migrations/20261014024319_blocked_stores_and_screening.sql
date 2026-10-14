-- Stores she never wants to see. Matched by web address.
create table public.blocked_stores (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  store_domain text not null,
  store text,
  created_at timestamptz not null default now(),
  primary key (user_id, store_domain)
);
alter table public.blocked_stores enable row level security;
create policy "See own blocks" on public.blocked_stores for select to authenticated using ((select auth.uid()) = user_id);
create policy "Add own blocks" on public.blocked_stores for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Remove own blocks" on public.blocked_stores for delete to authenticated using ((select auth.uid()) = user_id);

-- When her saved orders were last checked by the shopping/sensitive screen.
alter table public.profiles add column screened_at timestamptz;
