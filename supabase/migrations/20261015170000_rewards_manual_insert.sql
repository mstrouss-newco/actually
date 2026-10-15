-- People can add points by hand for programs we don't read from email.
-- Only their own rows, and only ones marked as typed in (gmail_id starts with "manual:").
create policy "Add own manual rewards" on public.rewards for insert to authenticated
  with check ((select auth.uid()) = user_id and gmail_id like 'manual:%');
