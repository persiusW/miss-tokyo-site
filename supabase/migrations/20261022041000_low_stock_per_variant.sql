-- Low stock per size and colour (BACKEND_GAPS 8). Each product has its own
-- warning level (default 2), and "low" is checked on every product_variants
-- row instead of the product roll-up, which summed every colour and size and
-- hid a sold-out size behind the others. Replaces the hard-coded "< 5" on the
-- old Overview and its "15+" badge. Additive only.
alter table public.products add column if not exists low_stock_at integer not null default 2;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_low_stock_at_check') then
    alter table public.products add constraint products_low_stock_at_check check (low_stock_at >= 0 and low_stock_at <= 1000);
  end if;
end $$;

comment on column public.products.low_stock_at is
  'A size or colour of this product counts as low when its stock is at or below this number. 0 = only sold out.';

-- Every size/colour that is low or sold out, one row each. Same rules as
-- src/lib/admin/v2/lowStock.ts (unit-tested there):
--   * active products that track stock and aren't taking pre-orders;
--   * variant-tracked products: each visible product_variants row;
--   * products without variant tracking hold one stock figure, so the
--     product itself is the one row (variant_id null);
--   * 9999 is the "not tracked" sentinel and never counts.
-- Read by Home and Products › Inventory with the service role only.
create or replace function public.fn_low_stock_variants()
returns table (
  product_id uuid,
  product_name text,
  variant_id uuid,
  size text,
  color text,
  brand text,
  inventory_count integer,
  low_stock_at integer
)
language sql
stable
security invoker
set search_path = public
as $$
  select p.id, p.name, v.id, v.size, v.color, v.brand, coalesce(v.inventory_count, 0), p.low_stock_at
  from public.products p
  join public.product_variants v on v.product_id = p.id
  where p.is_active and p.track_inventory is not false and p.preorder_enabled is not true
    and p.track_variant_inventory
    and v.visible is not false
    and coalesce(v.inventory_count, 0) <> 9999
    and coalesce(v.inventory_count, 0) <= p.low_stock_at
  union all
  select p.id, p.name, null::uuid, null::text, null::text, null::text, coalesce(p.inventory_count, 0), p.low_stock_at
  from public.products p
  where p.is_active and p.track_inventory is not false and p.preorder_enabled is not true
    and p.track_variant_inventory is not true
    and coalesce(p.inventory_count, 0) <> 9999
    and coalesce(p.inventory_count, 0) <= p.low_stock_at
$$;

revoke execute on function public.fn_low_stock_variants() from public, anon, authenticated;
grant execute on function public.fn_low_stock_variants() to service_role;
