-- Cancelled orders get their own kind. Return rules read from each store's emails.
alter table public.orders drop constraint if exists orders_kind_check;
alter table public.orders add constraint orders_kind_check check (kind in ('order','shipping','delivered','return','refund','receipt','cancel','other'));
alter table public.orders add column if not exists return_days integer check (return_days is null or (return_days between 0 and 400));
alter table public.orders add column if not exists return_note text check (return_note is null or length(return_note) <= 120);
alter table public.orders add column if not exists rules_read boolean not null default false;
-- One-time catch-up scans (cancellations, missed order emails, photos, return rules).
alter table public.profiles add column if not exists backfill_v integer not null default 0;
