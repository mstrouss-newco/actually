-- When her Gmail was last fully scanned, so the next scan only reads newer mail.
alter table public.profiles add column last_import_at timestamptz;
