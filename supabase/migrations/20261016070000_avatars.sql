-- Profile photos. Public to view (like the feed), stored as <handle>.jpg; only she can add, change or remove hers.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 524288, array['image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 524288, allowed_mime_types = array['image/jpeg'];

create policy "Add own photo" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and name = (select handle from public.profiles where id = (select auth.uid())) || '.jpg');
create policy "Change own photo" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and name = (select handle from public.profiles where id = (select auth.uid())) || '.jpg');
create policy "Remove own photo" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and name = (select handle from public.profiles where id = (select auth.uid())) || '.jpg');
create policy "See own photo row" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and name = (select handle from public.profiles where id = (select auth.uid())) || '.jpg');
