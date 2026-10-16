-- Pieces she sent back, read from the return or refund email itself (works for partial returns
-- and for return emails that don't carry the order number, like Bloomingdale's or Amazon).
alter table public.items add column if not exists returned_at timestamptz;
