-- One row per rewards email read. kind is null when the email had no balance in it.
create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gmail_id text not null,
  store text not null,
  store_domain text,
  kind text check (kind in ('points','credit','gift_card','reward')),
  points int,
  value numeric(10,2),
  expires_on date,
  sent_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id, gmail_id)
);
create index rewards_user on public.rewards (user_id, sent_at desc);
alter table public.rewards enable row level security;
create policy "Read own rewards" on public.rewards for select to authenticated using ((select auth.uid()) = user_id);
create policy "Delete own rewards" on public.rewards for delete to authenticated using ((select auth.uid()) = user_id);

-- Resale estimates, filled in by the value-items function.
alter table public.items
  add column resale_low numeric(10,2),
  add column resale_high numeric(10,2),
  add column resale_note text,
  add column resale_at timestamptz;
