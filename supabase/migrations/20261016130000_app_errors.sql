-- Errors people hit in the app, so the owner hears about them. Written only by the
-- report-error function; owners can read and clear them on the dashboard.
create table public.app_errors (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid references auth.users on delete set null,
  page text,
  message text not null,
  stack text,
  ua text,
  emailed boolean not null default false
);
create index app_errors_created on public.app_errors (created_at desc);
alter table public.app_errors enable row level security;
create policy "owners read errors" on public.app_errors for select to authenticated using (public.is_admin());
create policy "owners clear errors" on public.app_errors for delete to authenticated using (public.is_admin());
