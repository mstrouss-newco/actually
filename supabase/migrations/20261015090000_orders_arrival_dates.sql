-- Expected delivery dates, as the store's email states them.
alter table public.orders add column if not exists arrive_from date;
alter table public.orders add column if not exists arrive_to date;
