-- When the Paystack webhook settled the order. Additive and nullable: orders
-- paid before this column existed simply have no value.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at timestamptz;
