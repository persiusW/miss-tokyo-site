-- Analytics reports, computed in SQL (admin v2 Analytics).
--
-- The old Analytics page fetched every order in the range into the browser
-- and added them up there. PostgREST stops an unpaged select at 1000 rows, so
-- any range with more than 1000 orders (Year to date, from August 2026) was
-- silently cut short. The old Payments page had the same cap on all time.
-- These functions return one jsonb value however many orders there are.
--
-- Paid rule: exactly the one in fn_sales_summary, customer_spend and
-- src/lib/utils/metrics.ts, kept in one place here (fn_analytics_paid_orders).
-- Periods are half-open [from, to) on created_at. Shop days and hours are in
-- p_tz (Africa/Accra, which is UTC all year).
--
-- Service role only.

-- Paid orders placed in [p_from, p_to).
create or replace function public.fn_analytics_paid_orders(p_from timestamptz, p_to timestamptz)
returns setof public.orders
language sql
stable
security invoker
set search_path = public
as $$
  select o.* from public.orders o
  where (o.payment_status = 'paid'
         or (o.payment_status is null
             and o.status in ('paid', 'processing', 'fulfilled', 'delivered', 'packed', 'ready_for_pickup', 'shipped')))
    and o.created_at >= p_from and o.created_at < p_to
$$;

-- Sales and paid orders per bucket for a period and its comparison, for the
-- "Sales by day" chart. Bucket i covers [from + i*step, from + (i+1)*step).
-- Only buckets with sales are returned; the page fills the gaps with zero.
create or replace function public.fn_sales_series(
  p_from timestamptz,
  p_to timestamptz,
  p_cmp_from timestamptz default null,
  p_cmp_to timestamptz default null,
  p_step_seconds integer default 86400
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with cur as (
    select floor(extract(epoch from (o.created_at - p_from)) / p_step_seconds)::int as i,
           sum(coalesce(o.total_amount, 0)) as sales, count(*) as orders
    from public.fn_analytics_paid_orders(p_from, p_to) o
    group by 1
  ),
  cmp as (
    select floor(extract(epoch from (o.created_at - p_cmp_from)) / p_step_seconds)::int as i,
           sum(coalesce(o.total_amount, 0)) as sales, count(*) as orders
    from public.fn_analytics_paid_orders(p_cmp_from, p_cmp_to) o
    where p_cmp_from is not null and p_cmp_to is not null
    group by 1
  )
  select jsonb_build_object(
    'current', coalesce((select jsonb_agg(jsonb_build_object('i', i, 'sales', sales, 'orders', orders) order by i) from cur), '[]'::jsonb),
    'compare', case when p_cmp_from is not null and p_cmp_to is not null
                    then coalesce((select jsonb_agg(jsonb_build_object('i', i, 'sales', sales, 'orders', orders) order by i) from cmp), '[]'::jsonb) end
  )
$$;

-- One report for [p_from, p_to). p_kind:
--   products   units and sales per product, best sellers first
--   variants   units and sales per product, size and colour
--   channels   paid orders and sales per channel, plus every order placed
--   discounts  uses, money given and sales per code and automatic discount
--   discount_orders  the orders behind one discount (p_key = 'code:X' or 'auto:Title')
--   customers  unique, repeat, top customers, new customers by day, sign-ups
--   timing     paid orders by hour, by weekday and by day (plus all placed by day)
--   regions    paid orders and sales per delivery region
--   payments   paid orders and money per payment method, gift card value used
--   cash       till sales and cash taken per shop day
--   writeoffs  stock taken off by hand or written off
--   riders     per rider: orders assigned in the period and how they ended
--
-- A product's sales share out the order total (after discounts, with delivery)
-- across its lines by price x quantity, the same rule the old Reports tab used.
create or replace function public.fn_analytics_report(
  p_kind text,
  p_from timestamptz,
  p_to timestamptz,
  p_key text default null,
  p_tz text default 'Africa/Accra'
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  r jsonb;
begin
  if p_kind in ('products', 'variants') then
    with o as (
      select * from public.fn_analytics_paid_orders(p_from, p_to)
    ),
    lines as (
      select o.id, o.created_at, coalesce(o.total_amount, 0)::numeric as total,
        e,
        case when jsonb_typeof(e->'quantity') = 'number' then (e->>'quantity')::numeric else 1 end as qty,
        case when jsonb_typeof(e->'price') = 'number' then (e->>'price')::numeric else 0 end as price,
        count(*) over (partition by o.id) as n
      from o, jsonb_array_elements(case when jsonb_typeof(o.items) = 'array' then o.items else '[]'::jsonb end) e
    ),
    shared as (
      select l.*,
        sum(l.price * l.qty) over (partition by l.id) as line_sum,
        coalesce(nullif(l.e->>'productId', ''), nullif(l.e->>'name', ''), 'Unknown') as k,
        nullif(l.e->>'name', '') as nm,
        coalesce(l.e->>'size', '') as size,
        coalesce(l.e->>'color', '') as color
      from lines l
    ),
    priced as (
      select s.*,
        s.total * (case when s.line_sum > 0 then (s.price * s.qty) / s.line_sum else 1.0 / s.n end) as rev
      from shared s
    ),
    grouped as (
      select k,
        case when p_kind = 'variants' then size else '' end as size,
        case when p_kind = 'variants' then color else '' end as color,
        coalesce((array_agg(nm order by created_at) filter (where nm is not null))[1], left(k, 20)) as name,
        sum(qty) as units, sum(rev) as sales
      from priced
      group by 1, 2, 3
    )
    select coalesce(jsonb_agg(jsonb_build_object('key', k, 'name', name, 'size', size, 'color', color, 'units', units, 'sales', round(sales, 2))
             order by sales desc, units desc, name), '[]'::jsonb)
      into r from grouped;
    return jsonb_build_object('rows', r);

  elsif p_kind = 'channels' then
    with placed as (
      select case when o.source = 'pos' and o.payment_method = 'paystack' then 'pay_link'
                  when o.source in ('pos', 'whatsapp', 'web_chat') then o.source
                  else 'storefront' end as ch,
             (o.payment_status = 'paid'
              or (o.payment_status is null
                  and o.status in ('paid', 'processing', 'fulfilled', 'delivered', 'packed', 'ready_for_pickup', 'shipped'))) as paid,
             coalesce(o.total_amount, 0)::numeric as amount
      from public.orders o
      where o.created_at >= p_from and o.created_at < p_to
    ),
    g as (
      select ch, count(*) filter (where paid) as orders, coalesce(sum(amount) filter (where paid), 0) as sales, count(*) as placed
      from placed group by ch
    )
    select coalesce(jsonb_agg(jsonb_build_object('channel', ch, 'orders', orders, 'sales', sales, 'placed', placed) order by sales desc, placed desc), '[]'::jsonb)
      into r from g;
    return jsonb_build_object('rows', r);

  elsif p_kind = 'discounts' then
    with o as (select * from public.fn_analytics_paid_orders(p_from, p_to)),
    used as (
      select 'code:' || upper(o.discount_code) as key, 'code' as type, upper(o.discount_code) as label,
             coalesce(o.discount_amount, 0)::numeric as given, coalesce(o.total_amount, 0)::numeric as amount
      from o where coalesce(o.discount_code, '') <> ''
      union all
      select 'auto:' || o.auto_discount_title, 'auto', o.auto_discount_title,
             coalesce(o.auto_discount_amount, 0)::numeric, coalesce(o.total_amount, 0)::numeric
      from o where coalesce(o.auto_discount_title, '') <> ''
    ),
    g as (
      select key, type, label, count(*) as uses, sum(given) as given, sum(amount) as sales from used group by 1, 2, 3
    )
    select coalesce(jsonb_agg(jsonb_build_object('key', key, 'type', type, 'label', label, 'uses', uses, 'given', given, 'sales', sales)
             order by sales desc, uses desc), '[]'::jsonb)
      into r from g;
    return jsonb_build_object('rows', r);

  elsif p_kind = 'discount_orders' then
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', o.id, 'ref', o.ref, 'customer', coalesce(nullif(o.customer_name, ''), nullif(o.customer_email, '')),
             'amount', coalesce(o.total_amount, 0),
             'given', case when p_key like 'code:%' then coalesce(o.discount_amount, 0) else coalesce(o.auto_discount_amount, 0) end,
             'at', o.created_at) order by o.created_at desc), '[]'::jsonb)
      into r
      from public.fn_analytics_paid_orders(p_from, p_to) o
      where (p_key like 'code:%' and upper(o.discount_code) = substr(p_key, 6))
         or (p_key like 'auto:%' and o.auto_discount_title = substr(p_key, 6));
    return jsonb_build_object('rows', r);

  elsif p_kind = 'customers' then
    with o as (select *, nullif(lower(customer_email), '') as email from public.fn_analytics_paid_orders(p_from, p_to)),
    per as (
      select email,
             coalesce((array_agg(nullif(customer_name, '') order by created_at desc) filter (where nullif(customer_name, '') is not null))[1], email) as name,
             count(*) as orders, sum(coalesce(total_amount, 0)) as sales
      from o where email is not null group by email
    ),
    firsts as (
      select lower(f.customer_email) as email, min(f.created_at) as first_at
      from public.orders f
      where f.customer_email is not null and f.customer_email <> ''
        and (f.payment_status = 'paid'
             or (f.payment_status is null
                 and f.status in ('paid', 'processing', 'fulfilled', 'delivered', 'packed', 'ready_for_pickup', 'shipped')))
        and lower(f.customer_email) in (select email from per)
      group by 1
    ),
    newc as (
      select (first_at at time zone p_tz)::date as d, count(*) as n
      from firsts where first_at >= p_from and first_at < p_to group by 1
    )
    select jsonb_build_object(
      'unique', (select count(*) from per),
      'repeat', (select count(*) from per where orders > 1),
      'sales', (select coalesce(sum(sales), 0) from per),
      'no_email_orders', (select count(*) from o where email is null),
      'top', coalesce((select jsonb_agg(jsonb_build_object('email', email, 'name', name, 'orders', orders, 'sales', sales) order by sales desc, orders desc)
                       from (select * from per order by sales desc, orders desc limit 25) t), '[]'::jsonb),
      'new_by_day', coalesce((select jsonb_agg(jsonb_build_object('d', d, 'n', n) order by d) from newc), '[]'::jsonb),
      'new_total', (select coalesce(sum(n), 0) from newc),
      'newsletter', (select count(*) from public.newsletter_subscribers s where s.subscribed_at >= p_from and s.subscribed_at < p_to),
      'inquiries', (select count(*) from public.custom_requests c where c.created_at >= p_from and c.created_at < p_to)
    ) into r;
    return r;

  elsif p_kind = 'timing' then
    with o as (select created_at at time zone p_tz as t, coalesce(total_amount, 0) as amount from public.fn_analytics_paid_orders(p_from, p_to)),
    placed as (
      select (created_at at time zone p_tz)::date as d, count(*) as n
      from public.orders where created_at >= p_from and created_at < p_to group by 1
    ),
    paid_days as (select t::date as d, count(*) as n, sum(amount) as sales from o group by 1)
    select jsonb_build_object(
      'hours', coalesce((select jsonb_agg(jsonb_build_object('h', h, 'n', n, 'sales', sales) order by h)
                          from (select extract(hour from t)::int as h, count(*) as n, sum(amount) as sales from o group by 1) x), '[]'::jsonb),
      'weekdays', coalesce((select jsonb_agg(jsonb_build_object('wd', wd, 'n', n, 'sales', sales) order by wd)
                          from (select extract(isodow from t)::int as wd, count(*) as n, sum(amount) as sales from o group by 1) x), '[]'::jsonb),
      'days', coalesce((select jsonb_agg(jsonb_build_object('d', d, 'paid', coalesce(p.n, 0), 'sales', coalesce(p.sales, 0), 'placed', coalesce(a.n, 0)) order by d)
                          from placed a full join paid_days p using (d)), '[]'::jsonb)
    ) into r;
    return r;

  elsif p_kind = 'regions' then
    with o as (
      select coalesce(nullif(trim(shipping_address->>'region'), ''), nullif(trim(shipping_address->>'city'), '')) as region,
             coalesce(total_amount, 0) as amount
      from public.fn_analytics_paid_orders(p_from, p_to)
    )
    select jsonb_build_object(
      'rows', coalesce((select jsonb_agg(jsonb_build_object('region', region, 'orders', n, 'sales', sales) order by n desc, sales desc)
                        from (select region, count(*) as n, sum(amount) as sales from o where region is not null group by 1) x), '[]'::jsonb),
      'unknown', (select count(*) from o where region is null)
    ) into r;
    return r;

  elsif p_kind = 'payments' then
    with o as (select * from public.fn_analytics_paid_orders(p_from, p_to))
    select jsonb_build_object(
      'rows', coalesce((select jsonb_agg(jsonb_build_object('method', m, 'payments', n, 'amount', amount) order by amount desc, n desc)
                        from (select coalesce(payment_method, 'other') as m, count(*) as n, sum(coalesce(total_amount, 0)) as amount from o group by 1) x), '[]'::jsonb),
      'gift_used', (select coalesce(sum(g.amount_used), 0) from public.gift_card_redemptions g join o on o.id = g.order_id),
      'gift_orders', (select count(distinct g.order_id) from public.gift_card_redemptions g join o on o.id = g.order_id)
    ) into r;
    return r;

  elsif p_kind = 'cash' then
    with o as (select (created_at at time zone p_tz)::date as d, source, payment_method, coalesce(total_amount, 0) as amount
               from public.fn_analytics_paid_orders(p_from, p_to))
    select coalesce(jsonb_agg(jsonb_build_object('d', d, 'till_sales', till_sales, 'cash_orders', cash_orders, 'cash', cash) order by d desc), '[]'::jsonb)
      into r
      from (select d,
                   count(*) filter (where source = 'pos') as till_sales,
                   count(*) filter (where payment_method = 'cash') as cash_orders,
                   coalesce(sum(amount) filter (where payment_method = 'cash'), 0) as cash
            from o group by d) x
      where till_sales > 0 or cash_orders > 0;
    return jsonb_build_object('rows', r);

  elsif p_kind = 'writeoffs' then
    -- No reason in the ledger means "damaged or lost" yet. Until Products adds
    -- write_off, the closest honest reading is every hand-made decrease
    -- (admin_adjust or correction with a negative delta). write_off rows are
    -- picked up as soon as that reason exists.
    select coalesce(jsonb_agg(jsonb_build_object(
             'at', m.created_at, 'reason', m.reason,
             'qty', -coalesce(m.applied_delta, m.delta),
             'product', p.name, 'product_id', m.product_id,
             'size', v.size, 'color', v.color, 'note', m.note, 'by', pr.full_name)
             order by m.created_at desc), '[]'::jsonb)
      into r
      from public.stock_movements m
      left join public.products p on p.id = m.product_id
      left join public.product_variants v on v.id = m.variant_id
      left join public.profiles pr on pr.id = m.actor
      where m.created_at >= p_from and m.created_at < p_to
        and m.reason in ('write_off', 'admin_adjust', 'correction')
        and coalesce(m.applied_delta, m.delta) < 0;
    return jsonb_build_object('rows', r);

  elsif p_kind = 'riders' then
    with o as (
      select assigned_rider_id as rid, status, coalesce(total_amount, 0) as amount, created_at
      from public.orders
      where assigned_rider_id is not null and created_at >= p_from and created_at < p_to
    )
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', d.id, 'name', d.full_name, 'phone', d.phone_number, 'bike_reg', d.bike_reg, 'image_url', d.image_url, 'active', d.is_active,
             'total', coalesce(x.total, 0), 'delivered', coalesce(x.delivered, 0), 'in_transit', coalesce(x.in_transit, 0),
             'cancelled', coalesce(x.cancelled, 0), 'value', coalesce(x.value, 0), 'last_at', x.last_at)
             order by coalesce(x.total, 0) desc, d.full_name), '[]'::jsonb)
      into r
      from public.riders d
      left join (
        select rid, count(*) as total,
               count(*) filter (where status in ('fulfilled', 'delivered')) as delivered,
               count(*) filter (where status = 'shipped') as in_transit,
               count(*) filter (where status = 'cancelled') as cancelled,
               sum(amount) as value, max(created_at) as last_at
        from o group by rid
      ) x on x.rid = d.id;
    return jsonb_build_object('rows', r);
  end if;

  raise exception 'unknown report %', p_kind using errcode = '22023';
end;
$$;

revoke execute on function public.fn_analytics_paid_orders(timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.fn_sales_series(timestamptz, timestamptz, timestamptz, timestamptz, integer) from public, anon, authenticated;
revoke execute on function public.fn_analytics_report(text, timestamptz, timestamptz, text, text) from public, anon, authenticated;
grant execute on function public.fn_analytics_paid_orders(timestamptz, timestamptz) to service_role;
grant execute on function public.fn_sales_series(timestamptz, timestamptz, timestamptz, timestamptz, integer) to service_role;
grant execute on function public.fn_analytics_report(text, timestamptz, timestamptz, text, text) to service_role;
