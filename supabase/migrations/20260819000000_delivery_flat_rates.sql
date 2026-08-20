-- Flat-rate delivery fees.
--
-- Two zones, two flat rates, chosen by the customer at checkout and by staff at
-- the till. Purely additive: delivery_fees_enabled defaults to false, so
-- applying this to a live database changes no behaviour until the flag is
-- flipped. Within Accra is intentionally the dearer zone — intra-Accra is
-- door-to-door dispatch, outside-Accra is a bus parcel drop-off.

ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS delivery_fees_enabled boolean       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_fee_accra    numeric(10,2) NOT NULL DEFAULT 35,
  ADD COLUMN IF NOT EXISTS delivery_fee_outside  numeric(10,2) NOT NULL DEFAULT 20;

-- Stored as real columns rather than Paystack metadata: metadata has a size
-- limit that large carts already brush against, and the admin order screen
-- needs the value to render a correct subtotal.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_fee  numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_zone text;

-- The till writes the zone at draft time and the resolved fee at send-link
-- time. posSettlement reads both from here rather than from Paystack metadata,
-- because the gift-card settle path has no metadata at all.
ALTER TABLE pos_sessions
  ADD COLUMN IF NOT EXISTS delivery_fee  numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_zone text;
