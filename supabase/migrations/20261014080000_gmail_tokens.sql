-- Google refresh tokens, so Gmail keeps working past Google's one-hour pass.
-- Row level security is on with no policies: only server functions can read or write it.
create table public.gmail_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token text not null,
  updated_at timestamptz not null default now()
);
alter table public.gmail_tokens enable row level security;
revoke all on public.gmail_tokens from anon, authenticated;
