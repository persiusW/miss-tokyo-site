# Wix → Supabase Catalog Migration

## Files
- `schema.sql`   — Run this in Supabase SQL editor first
- `migrate.mjs`  — Node.js migration script (ESM)
- `migration.log`— Created after run; full record of every success/skip/error

---

## Prerequisites

- Node.js v18+ (uses native `fetch` and `AbortSignal.timeout`)
- A Supabase project with the schema applied (see below)
- A Supabase Storage bucket created and set to **public**

---

## Step 1 — Create the Supabase Storage bucket

In your Supabase dashboard:
1. Go to **Storage → New bucket**
2. Name it `product-images` (or whatever you set in `STORAGE_BUCKET`)
3. Toggle **Public bucket** ON
4. Click **Create bucket**

---

## Step 2 — Apply the schema

1. Go to **Supabase → SQL Editor**
2. Paste the contents of `schema.sql` and run it
3. Confirm the 4 tables appear: `categories`, `products`, `product_categories`, `product_variants`

---

## Step 3 — Install dependencies

```bash
npm init -y
npm install csv-parse @supabase/supabase-js
```

---

## Step 4 — Set environment variables

Create a `.env` file (or export in your shell):

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key   # Settings → API → service_role
CSV_PATH=./catalog_products.csv
STORAGE_BUCKET=product-images
```

> ⚠️ Use the **service_role** key, not the anon key. The script needs to bypass RLS to upsert rows.

Then load it before running:

```bash
export $(cat .env | xargs)
```

---

## Step 5 — Run the migration

```bash
node migrate.mjs
```

The script logs progress to stdout and writes a full `migration.log` on completion.

---

## What the script does

| Phase | What happens |
|-------|-------------|
| **Parse** | Reads the CSV, groups Variant rows under their Product row, normalises inventory (`InStock` → `true`, `0` → `false`), splits semicolon-delimited images and categories, generates URL slugs |
| **Images** | Downloads each image from `https://static.wixstatic.com/media/{hash}`, uploads to `{bucket}/{wix_handle_id}/{filename}`, records the public URL. Failed images are skipped and logged — the product still imports. |
| **DB upsert** | Inserts categories, then products, then `product_categories` links, then variants. All upserts use `onConflict` so re-running the script is safe. |

---

## Re-running safely

The script is fully idempotent:
- Products match on `wix_handle_id`
- Variants match on `(product_id, sku, option1_value, option2_value)`
- Categories match on `slug`
- Images use `upsert: true` in Storage

You can re-run after fixing failed images without duplicating data.

---

## Checking results

```sql
-- Quick summary
select
  (select count(*) from products)          as products,
  (select count(*) from product_variants)  as variants,
  (select count(*) from categories)        as categories,
  (select count(*) from product_categories) as links;

-- Sale products
select name, base_price, discount_value, sale_price
from products_with_price
where is_on_sale = true
order by discount_value desc;

-- Products with missing images
select name, wix_handle_id
from products
where array_length(images, 1) is null or array_length(images, 1) = 0;
```

---

## Notes on the data

- **Ribbon vs is_on_sale**: `ribbon` is the display label (e.g. "50% OFF", "New Arrivals"). `is_on_sale` is a computed boolean — only true when `discount_mode = PERCENT` and `discount_value > 0`. Both are stored.
- **option2_label**: Color variants store values like `rgb(239,0,126):Pink`. The script parses the human label (`Pink`) into `option2_label` for display, and keeps the raw value in `option2_value`.
- **inventory_qty null**: When Wix reports `InStock` with no count, `inventory_qty` is `null` but `in_stock` is `true`. Your frontend should treat `null` qty as "available, count unknown".
- **Variant-less products**: Some products have no Variant rows (e.g. single-SKU items). The script synthesises a single variant from the Product row so every product has at least one purchasable variant.
