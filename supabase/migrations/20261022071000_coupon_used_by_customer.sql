-- "One use per customer" for discount codes (BACKEND_GAPS 14).
--
-- coupons.single_use_per_customer has existed (default false) since the
-- table was made, but nothing ever read it: discount_holds count uses per
-- code, not per customer, and neither validate-code nor validateDiscountCode
-- looked at who was buying. This answers "has this customer already used
-- this code?" by email or by phone number (the last 9 digits, so 024…,
-- +233 24… and 23324… are the same person), counting paid orders only, with
-- exactly the paid rule of fn_sales_summary: payment_status = 'paid', or, for
-- orders from before the dual-status migration, payment_status is null and
-- status is one of the legacy paid statuses. An unpaid or cancelled attempt
-- doesn't use the code up.
--
-- The caller (src/lib/discountValidation.ts) drops the store's own stand-in
-- addresses before calling, so walk-ins sharing the shop's mailbox are not
-- treated as one customer. Service role only.
create or replace function public.fn_coupon_used_by_customer(p_code text, p_email text, p_phone_tail text)
returns boolean
language sql
stable
set search_path to 'public'
set statement_timeout to '5s'
as $$
  select exists (
    select 1 from public.orders o
    where upper(o.discount_code) = upper(trim(p_code))
      and (o.payment_status = 'paid'
           or (o.payment_status is null
               and o.status in ('paid', 'processing', 'fulfilled', 'delivered', 'packed', 'ready_for_pickup', 'shipped')))
      and (
        (nullif(trim(p_email), '') is not null and lower(o.customer_email) = lower(trim(p_email)))
        or (length(coalesce(p_phone_tail, '')) = 9
            and right(regexp_replace(coalesce(o.customer_phone, ''), '\D', '', 'g'), 9) = p_phone_tail)
      )
  );
$$;

revoke execute on function public.fn_coupon_used_by_customer(text, text, text) from public, anon, authenticated;
grant execute on function public.fn_coupon_used_by_customer(text, text, text) to service_role;
