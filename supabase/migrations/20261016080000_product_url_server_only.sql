-- Product links come only from our server (read-order), never typed in from the app, and only https.
alter table public.items add constraint items_product_url_https check (product_url is null or product_url ~ '^https://[^/\s]+/\S*$') not valid;

create or replace function public.keep_product_url()
 returns trigger
 language plpgsql
 set search_path to ''
as $function$
begin
  if coalesce(auth.role(), '') <> 'service_role' and current_user <> 'postgres' then
    if tg_op = 'INSERT' then new.product_url := null;
    else new.product_url := old.product_url;
    end if;
  end if;
  return new;
end;
$function$;
create trigger keep_product_url before insert or update of product_url on public.items
  for each row execute function public.keep_product_url();
revoke execute on function public.keep_product_url() from public, anon, authenticated;
