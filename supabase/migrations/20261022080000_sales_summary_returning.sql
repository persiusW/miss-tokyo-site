-- Returning customers for Analytics (BACKEND_GAPS 2), added to fn_sales_summary.
--
-- Additive only: every key Home reads (sales, orders, items, aov, cash,
-- cash_orders) is computed exactly as before. Three keys are added to each
-- period's body:
--   known_orders      paid orders in the period that carry a customer email
--   returning_orders  of those, the ones whose customer (lower(email), the
--                     contact key customer_spend uses) had an earlier paid
--                     order, at any time before this order was placed
--   customers         distinct customer emails among the period's paid orders
-- Analytics shows returning_orders / known_orders. Orders with no email (till
-- walk-ins) can't be matched to anyone, so they are left out of the share and
-- the page says so.
--
-- The paid rule is the one in src/lib/utils/metrics.ts, customer_spend and the
-- original function: payment_status = 'paid', or, for orders from before the
-- dual-status migration, payment_status is null and status is one of the
-- legacy paid statuses.
--
-- Same signature, so CREATE OR REPLACE keeps the grants; they are restated
-- below anyway. Service role only.

-- The "earlier paid order" lookup reads orders by contact key and time.
create index if not exists idx_orders_lower_email_created
  on public.orders (lower(customer_email), created_at);

create or replace function public.fn_sales_summary(
  p_from timestamptz,
  p_to timestamptz,
  p_cmp_from timestamptz default null,
  p_cmp_to timestamptz default null
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with revenue as (
    select o.created_at, o.total_amount, o.payment_method, o.items,
           nullif(lower(o.customer_email), '') as email
    from public.orders o
    where (o.payment_status = 'paid'
           or (o.payment_status is null
               and o.status in ('paid', 'processing', 'fulfilled', 'delivered', 'packed', 'ready_for_pickup', 'shipped')))
      and ((o.created_at >= p_from and o.created_at < p_to)
           or (p_cmp_from is not null and p_cmp_to is not null and o.created_at >= p_cmp_from and o.created_at < p_cmp_to))
  ),
  tagged as (
    select
      case when created_at >= p_from and created_at < p_to then 'current' else 'compare' end as period,
      coalesce(total_amount, 0)::numeric as amount,
      payment_method,
      email,
      (select coalesce(sum(case when jsonb_typeof(e->'quantity') = 'number' then (e->>'quantity')::numeric else 1 end), 0)
         from jsonb_array_elements(case when jsonb_typeof(items) = 'array' then items else '[]'::jsonb end) e) as qty,
      (email is not null and exists (
         select 1 from public.orders p
         where lower(p.customer_email) = r.email
           and p.created_at < r.created_at
           and (p.payment_status = 'paid'
                or (p.payment_status is null
                    and p.status in ('paid', 'processing', 'fulfilled', 'delivered', 'packed', 'ready_for_pickup', 'shipped')))
      )) as is_returning
    from revenue r
  ),
  agg as (
    select period,
      sum(amount) as sales,
      count(*) as orders,
      sum(qty) as items,
      coalesce(sum(amount) filter (where payment_method = 'cash'), 0) as cash,
      count(*) filter (where payment_method = 'cash') as cash_orders,
      count(*) filter (where email is not null) as known_orders,
      count(*) filter (where is_returning) as returning_orders,
      count(distinct email) as customers
    from tagged
    group by period
  ),
  shaped as (
    select p.period,
      jsonb_build_object(
        'sales', coalesce(a.sales, 0),
        'orders', coalesce(a.orders, 0),
        'items', coalesce(a.items, 0),
        'aov', case when coalesce(a.orders, 0) > 0 then a.sales / a.orders else 0 end,
        'cash', coalesce(a.cash, 0),
        'cash_orders', coalesce(a.cash_orders, 0),
        'known_orders', coalesce(a.known_orders, 0),
        'returning_orders', coalesce(a.returning_orders, 0),
        'customers', coalesce(a.customers, 0)
      ) as body
    from (values ('current'), ('compare')) as p(period)
    left join agg a on a.period = p.period
  )
  select jsonb_build_object(
    'current', (select body from shaped where period = 'current'),
    'compare', case when p_cmp_from is not null and p_cmp_to is not null
                    then (select body from shaped where period = 'compare') end
  )
$$;

revoke execute on function public.fn_sales_summary(timestamptz, timestamptz, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.fn_sales_summary(timestamptz, timestamptz, timestamptz, timestamptz) to service_role;
