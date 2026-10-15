-- The same piece in two colors (a tee in Black and White) is two items, not one.
alter table public.items drop constraint items_user_id_gmail_id_name_size_key;
alter table public.items add constraint items_user_gmail_name_size_color_key unique nulls not distinct (user_id, gmail_id, name, size, color);
