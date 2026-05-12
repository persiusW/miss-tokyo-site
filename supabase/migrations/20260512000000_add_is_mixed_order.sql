-- Mixed orders contain both in-stock and pre-order items.
-- Set at order creation in /api/paystack/initialize.
-- Used to filter orders page (regular + mixed) vs pre-orders page (preorder + mixed).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_mixed_order boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_orders_is_mixed_order ON orders (is_mixed_order);
