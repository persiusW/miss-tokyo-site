-- Sales for a period and a comparison period, computed in SQL (BACKEND_GAPS 1).
-- Home's "Sales so far" uses it now; Analytics will reuse it.
--
-- The revenue definition is exactly the one in src/lib/utils/metrics.ts:
--   payment_status = 'paid', or, for orders from before the dual-status
--   migration, payment_status is null and status is one of the legacy paid
--   statuses. Nothing else is excluded: a paid order whose status later
--   became cancelled or refunded still counts while payment_status is 'paid',
--   the same as metrics.ts. Orders are placed in a period by created_at,
--   half-open [from, to).
-- "Cash" is the cash to count at close, as the old Overview counts it: the
-- revenue orders with payment_method = 'cash'.
--
-- Returns jsonb so later readers (Analytics' returning-customer rate) can add
-- keys with CREATE OR REPLACE instead of changing the return type:
--   { "current": {sales, orders, items, aov, cash, cash_orders},
--     "compare": {…same…} | null }
-- Service role only.
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
    select o.created_at, o.total_amount, o.payment_method, o.items
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
      (select coalesce(sum(case when jsonb_typeof(e->'quantity') = 'number' then (e->>'quantity')::numeric else 1 end), 0)
         from jsonb_array_elements(case when jsonb_typeof(items) = 'array' then items else '[]'::jsonb end) e) as qty
    from revenue
  ),
  agg as (
    select period,
      sum(amount) as sales,
      count(*) as orders,
      sum(qty) as items,
      coalesce(sum(amount) filter (where payment_method = 'cash'), 0) as cash,
      count(*) filter (where payment_method = 'cash') as cash_orders
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
        'cash_orders', coalesce(a.cash_orders, 0)
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
