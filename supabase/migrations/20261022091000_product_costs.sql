-- Cost per item (BACKEND_GAPS 7). What a product, or one size/colour of it,
-- costs the shop to make or buy, so Products can show a margin.
--
-- Kept in its own table rather than as products.cost_ghs and
-- product_variants.cost_ghs, because those two tables are readable by anyone:
-- products has a "public read" policy with qual true, product_variants another,
-- and the anon key is in every browser. A column there could be fetched by any
-- visitor (GET /rest/v1/products?select=cost_ghs), and every server page that
-- selects products with the service role would carry it toward the storefront.
-- This table has RLS on and no policies, and no grants for anon or
-- authenticated, so only the service role reads it, and only the admin's
-- Products code asks (owner and admin only, checked on the server).
--
-- variant_id null = the product's cost; a row with a variant_id overrides it for
-- that size/colour. Margin is worked out in the UI. Additive only.
create table if not exists public.product_costs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  cost_ghs numeric(12,2) not null check (cost_ghs >= 0 and cost_ghs < 10000000),
  updated_by uuid,
  updated_at timestamptz not null default now(),
  constraint product_costs_one_per_item unique nulls not distinct (product_id, variant_id)
);

alter table public.product_costs enable row level security;
revoke all on table public.product_costs from public, anon, authenticated;
grant all on table public.product_costs to service_role;

comment on table public.product_costs is
  'Cost per item (admin only). Never exposed to the storefront: RLS on, no policies, service role only.';
