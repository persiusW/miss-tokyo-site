-- Add payment_status
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_status TEXT
    CHECK (payment_status IN ('pending','paid','refunded','cancelled'))
    DEFAULT 'pending';

-- Add fulfillment_status
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS fulfillment_status TEXT
    CHECK (fulfillment_status IN ('inbox','processing','packed','shipped','ready_for_pickup','delivered'))
    DEFAULT 'inbox';

-- Backfill payment_status from status
UPDATE orders SET payment_status = CASE
  WHEN status IN ('paid','processing','packed','shipped','ready_for_pickup','fulfilled','delivered') THEN 'paid'
  WHEN status = 'refunded' THEN 'refunded'
  WHEN status = 'cancelled' THEN 'cancelled'
  ELSE 'pending'
END;

-- Backfill fulfillment_status from status
UPDATE orders SET fulfillment_status = CASE
  WHEN status = 'processing' THEN 'processing'
  WHEN status = 'packed' THEN 'packed'
  WHEN status = 'shipped' THEN 'shipped'
  WHEN status = 'ready_for_pickup' THEN 'ready_for_pickup'
  WHEN status IN ('fulfilled','delivered') THEN 'delivered'
  ELSE 'inbox'
END
WHERE status NOT IN ('pending','cancelled','refunded');

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_status ON orders(fulfillment_status);
