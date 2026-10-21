-- The processing fee is an admin setting now (Admin Tools › Fees); the owner
-- can no longer change it (owner decision 2026-10-21).
--
-- 1. The saved label read ".2.5%" (a typo). Checkout and receipts show it
--    as the fee's name, so it becomes "Processing fee". Was: '.2.5%'.
-- 2. store_settings has a second row id='1' (0%, "Service Charge", every
--    switch off). Nothing reads it any more: the old /admin/settings and
--    /admin/products/new pages, the only readers, now read 'default'. It is
--    kept, not deleted, and recorded here and in the table comment.
-- 3. store_settings stays owner-writable through RLS (other settings), so a
--    trigger keeps the three fee columns as they were whenever a signed-in
--    caller other than an admin writes the row. The service role (server
--    code, which checks roles itself) and the admin are unaffected.
update public.store_settings
   set platform_fee_label = 'Processing fee'
 where id = 'default' and platform_fee_label = '.2.5%';

comment on table public.store_settings is
    'Shop settings. Only id=''default'' is read. Row id=''1'' is stale (0% fee, old /admin/settings page) and kept for the record since 2026-10-22; nothing reads it.';

create or replace function public.fn_store_settings_fee_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if auth.uid() is not null and not exists (
        select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
    ) then
        new.platform_fee_percentage := old.platform_fee_percentage;
        new.platform_fee_label := old.platform_fee_label;
        new.show_fee_at_checkout := old.show_fee_at_checkout;
    end if;
    return new;
end;
$$;

revoke execute on function public.fn_store_settings_fee_guard() from public, anon, authenticated;

drop trigger if exists tr_store_settings_fee_guard on public.store_settings;
create trigger tr_store_settings_fee_guard
    before update on public.store_settings
    for each row execute function public.fn_store_settings_fee_guard();
