-- Products: enable pre-order per product and set an estimated availability date
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS preorder_enabled        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preorder_estimated_date date;

-- Orders: denormalized flag for fast pre-orders tab filtering
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS has_preorder boolean NOT NULL DEFAULT false;

-- Partial index — only indexes the rows we care about
CREATE INDEX IF NOT EXISTS orders_has_preorder_created_idx
  ON orders (created_at DESC)
  WHERE has_preorder = true;
