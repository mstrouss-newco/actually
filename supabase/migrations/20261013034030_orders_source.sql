-- Where an order email came from: her Gmail, or her shopping email address.
alter table public.orders add column source text not null default 'gmail' check (source in ('gmail', 'shopping'));
alter table public.items add column source text not null default 'gmail' check (source in ('gmail', 'shopping'));
