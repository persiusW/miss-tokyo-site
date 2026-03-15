-- ─────────────────────────────────────────────────────────────────
-- Wix → Supabase catalog schema
-- Run this in the Supabase SQL editor before running migrate.mjs
-- ─────────────────────────────────────────────────────────────────

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── categories ────────────────────────────────────────────────────
create table if not exists categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  sort_order  integer default 0,
  created_at  timestamptz default now()
);

-- ── products ──────────────────────────────────────────────────────
create table if not exists products (
  id              uuid primary key default gen_random_uuid(),
  wix_handle_id   text unique not null,          -- original Wix ID, migration anchor
  name            text not null,
  description     text,
  slug            text unique not null,
  base_price      numeric(10,2) not null default 0,
  discount_mode   text,                          -- 'PERCENT' | null
  discount_value  numeric(5,2) default 0,        -- e.g. 50 means 50%
  is_on_sale      boolean generated always as (
                    discount_mode = 'PERCENT' and discount_value > 0
                  ) stored,
  ribbon          text,                          -- sale badge label, e.g. '50% OFF'
  brand           text,
  visible         boolean default true,
  images          text[] default '{}',           -- ordered array of Supabase Storage public URLs
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ── product_categories (join table) ───────────────────────────────
create table if not exists product_categories (
  product_id    uuid not null references products(id)   on delete cascade,
  category_id   uuid not null references categories(id) on delete cascade,
  primary key (product_id, category_id)
);

-- ── product_variants ──────────────────────────────────────────────
create table if not exists product_variants (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references products(id) on delete cascade,
  sku             text,
  price_override  numeric(10,2),          -- null means use product base_price
  inventory_qty   integer,                -- null when Wix reports 'InStock' without a count
  in_stock        boolean,
  visible         boolean default true,
  option1_name    text,                   -- e.g. 'Size'
  option1_value   text,                   -- raw Wix value, e.g. 'Free size (8-14)'
  option1_label   text,                   -- human label, same as value for size
  option2_name    text,                   -- e.g. 'Color'
  option2_value   text,                   -- raw Wix value, e.g. 'rgb(239,0,126):Pink'
  option2_label   text,                   -- parsed label, e.g. 'Pink'
  created_at      timestamptz default now(),
  -- prevent duplicate variants on the same product
  unique (product_id, sku, option1_value, option2_value)
);

-- ── Indexes ───────────────────────────────────────────────────────
create index if not exists idx_products_slug           on products(slug);
create index if not exists idx_products_visible        on products(visible);
create index if not exists idx_products_is_on_sale     on products(is_on_sale);
create index if not exists idx_product_variants_product on product_variants(product_id);
create index if not exists idx_product_variants_sku    on product_variants(sku);
create index if not exists idx_product_categories_cat  on product_categories(category_id);

-- ── updated_at trigger ────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger products_updated_at
  before update on products
  for each row execute function set_updated_at();

-- ── Useful view: products with computed sale price ─────────────────
create or replace view products_with_price as
select
  p.*,
  case
    when p.discount_mode = 'PERCENT' and p.discount_value > 0
    then round(p.base_price * (1 - p.discount_value / 100), 2)
    else p.base_price
  end as sale_price
from products p;
