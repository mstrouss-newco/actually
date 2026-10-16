-- Product photos with the background removed, for outfit boards. Public to view; only the server writes them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cutouts', 'cutouts', true, 2097152, array['image/png'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/png'];
