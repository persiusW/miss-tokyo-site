-- Orders, sales and amount given away per discount (BACKEND_GAPS 16), for the
-- Discounts list's Sales column and the discount panel's Results tab.
--
-- The same calculation as Analytics › Reports › Discount / Promo Performance
-- (sales/analytics/page.tsx), exposed per discount id and done in SQL so it
-- isn't cut off by PostgREST's 1000-row cap:
--   codes      orders whose discount_code matches the code (any case); sales
--              is total_amount, given away is discount_amount (the code's
--              part only; automatic savings are kept in auto_discount_amount).
--   automatic  orders whose auto_discount_title lists the rule's title (the
--              old Auto Discounts page counted uses the same way). Given away
--              is auto_discount_amount, but only from orders where this was
--              the only automatic discount: an order with two keeps one
--              combined figure that can't be split honestly, so those are
--              counted in shared_orders instead.
-- Paid orders only, with exactly the paid rule of fn_sales_summary.
-- all_orders counts every order that used it, paid or not (the old "Uses").
-- Service role only: the admin reads it on the server.
create or replace function public.fn_discount_results()
returns table (kind text, discount_id uuid, orders bigint, sales numeric, given numeric, shared_orders bigint, all_orders bigint)
language sql
stable
set search_path to 'public'
set statement_timeout to '8s'
as $$
  with o as (
    select upper(trim(x.discount_code)) as code, x.auto_discount_title, x.total_amount, x.discount_amount, x.auto_discount_amount,
      (x.payment_status = 'paid'
       or (x.payment_status is null
           and x.status in ('paid', 'processing', 'fulfilled', 'delivered', 'packed', 'ready_for_pickup', 'shipped'))) as paid
    from public.orders x
    where x.discount_code is not null or x.auto_discount_title is not null
  ),
  titles as (
    select o.*, trim(t) as title, array_length(string_to_array(o.auto_discount_title, ','), 1) as n_titles
    from o, unnest(string_to_array(o.auto_discount_title, ',')) t
    where o.auto_discount_title is not null
  )
  select 'code'::text, c.id,
    count(*) filter (where o.paid),
    coalesce(sum(o.total_amount) filter (where o.paid), 0),
    coalesce(sum(o.discount_amount) filter (where o.paid), 0),
    0::bigint,
    count(o.code)
  from public.coupons c
  left join o on o.code = upper(trim(c.code))
  group by c.id
  union all
  select 'auto'::text, a.id,
    count(*) filter (where t.paid),
    coalesce(sum(t.total_amount) filter (where t.paid), 0),
    coalesce(sum(t.auto_discount_amount) filter (where t.paid and t.n_titles = 1), 0),
    count(*) filter (where t.paid and t.n_titles > 1),
    count(t.title)
  from public.automatic_discounts a
  left join titles t on t.title = a.title
  group by a.id;
$$;

revoke execute on function public.fn_discount_results() from public, anon, authenticated;
grant execute on function public.fn_discount_results() to service_role;
