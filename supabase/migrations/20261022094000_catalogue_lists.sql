-- Products and Inventory lists (admin v2). The list chips (Low stock, Sold out,
-- No photo…) need sums over product_variants and each product's own warning
-- level, which PostgREST filters can't express, and product_variants is past
-- the 1000-row cap. These functions do the sums in SQL; the app pages and
-- filters their results with .range() and count: "exact". The rules match
-- src/lib/admin/v2/catalogue.ts (unit-tested) and fn_low_stock_variants, so
-- Home, Products and Inventory count the same rows. Read-only, service role only.

-- One row per product with its stock summary.
--   status   archived (archived_at set and not active), active, or draft
--   tracked  counts stock (not the 9999 "not tracked" sentinel)
--   options / options_out / options_low   visible sizes and colours, sold out,
--            and at or under low_stock_at (but not sold out). A product
--            without variant tracking is one option.
--   view_low / view_out   the Low stock and Sold out chips: active, tracked,
--            not on pre-order; sold out = nothing left in any option.
create or replace function public.fn_admin_product_rows(p_q text default null)
returns table (
  id uuid,
  name text,
  slug text,
  sku text,
  category_type text,
  category_ids uuid[],
  price_ghs numeric,
  compare_at_price_ghs numeric,
  is_active boolean,
  archived_at timestamptz,
  status text,
  created_at timestamptz,
  track_inventory boolean,
  track_variant_inventory boolean,
  preorder_enabled boolean,
  preorder_estimated_date date,
  low_stock_at integer,
  thumb text,
  photos integer,
  tracked boolean,
  stock_total integer,
  options integer,
  options_out integer,
  options_low integer,
  view_low boolean,
  view_out boolean
)
language sql
stable
set search_path = public
as $$
  with b as (
    select p.*,
      case when p.archived_at is not null and p.is_active is not true then 'archived'
           when p.is_active then 'active' else 'draft' end as st,
      (select u from unnest(p.image_urls) u where u !~* '\.(mp4|mov|webm|m4v)(\?|$)' limit 1) as first_image,
      coalesce(cardinality(p.image_urls), 0)
        + case when jsonb_typeof(p.media) = 'array' then jsonb_array_length(p.media) else 0 end as n_photos,
      a.n, a.total, a.n_out, a.n_low, a.skus
    from public.products p
    left join lateral (
      select count(*)::int as n,
             coalesce(sum(greatest(0, coalesce(v.inventory_count, 0))), 0)::int as total,
             (count(*) filter (where coalesce(v.inventory_count, 0) <= 0))::int as n_out,
             (count(*) filter (where coalesce(v.inventory_count, 0) > 0
                                 and coalesce(v.inventory_count, 0) <= p.low_stock_at))::int as n_low,
             string_agg(v.sku, ' ') as skus
      from public.product_variants v
      where v.product_id = p.id and v.visible is not false and coalesce(v.inventory_count, 0) <> 9999
    ) a on p.track_variant_inventory
  ), s as (
    select b.*,
      (b.track_inventory is not false and (b.track_variant_inventory or coalesce(b.inventory_count, 0) <> 9999)) as is_tracked,
      case when b.track_variant_inventory then coalesce(b.total, 0) else greatest(0, coalesce(b.inventory_count, 0)) end as s_total,
      case when b.track_variant_inventory then coalesce(b.n, 0) else 1 end as s_options,
      case when b.track_variant_inventory then coalesce(b.n_out, 0)
           else (coalesce(b.inventory_count, 0) <= 0)::int end as s_out,
      case when b.track_variant_inventory then coalesce(b.n_low, 0)
           else (coalesce(b.inventory_count, 0) > 0 and coalesce(b.inventory_count, 0) <= b.low_stock_at)::int end as s_low
    from b
  )
  select s.id, s.name, s.slug, s.sku, s.category_type, s.category_ids, s.price_ghs, s.compare_at_price_ghs,
         coalesce(s.is_active, false), s.archived_at, s.st, s.created_at,
         s.track_inventory, s.track_variant_inventory, coalesce(s.preorder_enabled, false), s.preorder_estimated_date,
         s.low_stock_at, s.first_image, s.n_photos::int,
         s.is_tracked, s.s_total, s.s_options, s.s_out, s.s_low,
         (s.st = 'active' and s.preorder_enabled is not true and s.is_tracked and s.s_total > 0 and (s.s_out + s.s_low) > 0),
         (s.st = 'active' and s.preorder_enabled is not true and s.is_tracked and s.s_total = 0)
  from s
  where nullif(btrim(coalesce(p_q, '')), '') is null
     or position(lower(btrim(p_q)) in lower(concat_ws(' ', s.name, s.sku, s.category_type, s.slug, s.skus))) > 0
$$;

-- The chip counts for the Products list, for the same search.
create or replace function public.fn_admin_product_counts(p_q text default null)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'all',      count(*) filter (where status <> 'archived'),
    'active',   count(*) filter (where status = 'active'),
    'draft',    count(*) filter (where status = 'draft'),
    'low',      count(*) filter (where view_low),
    'out',      count(*) filter (where view_out),
    'nophoto',  count(*) filter (where photos = 0 and status <> 'archived'),
    'preorder', count(*) filter (where preorder_enabled and status <> 'archived'),
    'archived', count(*) filter (where status = 'archived')
  )
  from public.fn_admin_product_rows(p_q)
$$;

-- One row per stock figure: each visible size/colour of a variant-tracked
-- product, or the product itself when it holds one figure. Untracked products
-- and archived ones are left out. state:
--   preorder  taking pre-orders, so stock can't run out
--   hidden    a draft: not in the shop, so not counted as low or sold out
--   out / low / ok   against the product's low_stock_at, the same rows
--             fn_low_stock_variants returns for Home
create or replace function public.fn_inventory_rows(p_q text default null)
returns table (
  product_id uuid,
  product_name text,
  product_sku text,
  variant_id uuid,
  size text,
  color text,
  brand text,
  sku text,
  inventory_count integer,
  low_stock_at integer,
  is_active boolean,
  preorder_enabled boolean,
  state text,
  thumb text
)
language sql
stable
set search_path = public
as $$
  with r as (
    select p.id as product_id, p.name as product_name, p.sku as product_sku, v.id as variant_id,
           v.size, v.color, v.brand, v.sku, coalesce(v.inventory_count, 0) as n,
           p.low_stock_at, coalesce(p.is_active, false) as active, coalesce(p.preorder_enabled, false) as pre,
           p.image_urls
    from public.products p
    join public.product_variants v on v.product_id = p.id
    where p.track_variant_inventory and p.track_inventory is not false
      and v.visible is not false and coalesce(v.inventory_count, 0) <> 9999
      and (p.archived_at is null or p.is_active)
    union all
    select p.id, p.name, p.sku, null::uuid, null::text, null::text, null::text, p.sku, coalesce(p.inventory_count, 0),
           p.low_stock_at, coalesce(p.is_active, false), coalesce(p.preorder_enabled, false), p.image_urls
    from public.products p
    where p.track_variant_inventory is not true and p.track_inventory is not false
      and coalesce(p.inventory_count, 0) <> 9999
      and (p.archived_at is null or p.is_active)
  )
  select r.product_id, r.product_name, r.product_sku, r.variant_id, r.size, r.color, r.brand, r.sku, r.n, r.low_stock_at,
         r.active, r.pre,
         case when r.pre then 'preorder'
              when not r.active then 'hidden'
              when r.n <= 0 then 'out'
              when r.n <= r.low_stock_at then 'low'
              else 'ok' end,
         (select u from unnest(r.image_urls) u where u !~* '\.(mp4|mov|webm|m4v)(\?|$)' limit 1)
  from r
  where nullif(btrim(coalesce(p_q, '')), '') is null
     or position(lower(btrim(p_q)) in lower(concat_ws(' ', r.product_name, r.product_sku, r.sku, r.size, r.color, r.brand))) > 0
$$;

-- The Inventory KPIs: items in stock across active products, and sizes
-- running low or sold out (the same rows Home's low-stock card counts).
create or replace function public.fn_inventory_summary()
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'items',    coalesce(sum(greatest(0, inventory_count)) filter (where is_active), 0),
    'products', count(distinct product_id) filter (where is_active),
    'low',      count(*) filter (where state = 'low'),
    'out',      count(*) filter (where state = 'out')
  )
  from public.fn_inventory_rows(null)
$$;

-- Products whose total no longer matches the sum of their sizes: the same
-- comparison the nightly reconcile-stock cron makes, read live so Inventory can
-- show a warning. Only variant-tracked products that track stock.
create or replace function public.fn_stock_drift()
returns table (product_id uuid, name text, is_active boolean, rollup integer, variant_sum integer)
language sql
stable
set search_path = public
as $$
  select p.id, p.name, coalesce(p.is_active, false), coalesce(p.inventory_count, 0), coalesce(s.total, 0)
  from public.products p
  left join (
    select product_id, sum(coalesce(inventory_count, 0))::int as total
    from public.product_variants group by product_id
  ) s on s.product_id = p.id
  where p.track_variant_inventory and p.track_inventory is not false
    and coalesce(p.inventory_count, 0) <> coalesce(s.total, 0)
$$;

revoke execute on function public.fn_admin_product_rows(text) from public, anon, authenticated;
revoke execute on function public.fn_admin_product_counts(text) from public, anon, authenticated;
revoke execute on function public.fn_inventory_rows(text) from public, anon, authenticated;
revoke execute on function public.fn_inventory_summary() from public, anon, authenticated;
revoke execute on function public.fn_stock_drift() from public, anon, authenticated;
grant execute on function public.fn_admin_product_rows(text) to service_role;
grant execute on function public.fn_admin_product_counts(text) to service_role;
grant execute on function public.fn_inventory_rows(text) to service_role;
grant execute on function public.fn_inventory_summary() to service_role;
grant execute on function public.fn_stock_drift() to service_role;
