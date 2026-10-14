alter table public.items drop constraint items_pick_check;
alter table public.items add constraint items_pick_check check (pick in ('share','sell','private'));
