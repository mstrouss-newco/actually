alter table public.items
  add column if not exists for_whom text check (for_whom in ('me','kids','partner','other')),
  add column if not exists hidden boolean not null default false;
