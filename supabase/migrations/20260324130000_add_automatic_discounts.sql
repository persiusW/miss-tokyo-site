-- Automatic Discounts
-- Non-destructive: adds a new table and two nullable columns to orders.
-- Zero impact on existing data or flows when no active rules exist.

-- ── New table ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.automatic_discounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT NOT NULL,
  is_active           BOOLEAN DEFAULT true,
  discount_type       TEXT NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FIXED')),
  discount_value      NUMERIC NOT NULL,
  applies_to          TEXT NOT NULL CHECK (applies_to IN ('ALL_PRODUCTS', 'SPECIFIC_CATEGORIES', 'SPECIFIC_PRODUCTS')),
  target_category_ids UUID[]  DEFAULT '{}',
  target_product_ids  UUID[]  DEFAULT '{}',
  min_quantity        INTEGER DEFAULT 1,
  -- ACROSS_TARGET: combined qty of all matching items must meet min_quantity
  -- PER_PRODUCT:   each individual cart line must independently meet min_quantity
  quantity_scope      TEXT NOT NULL DEFAULT 'ACROSS_TARGET'
                        CHECK (quantity_scope IN ('PER_PRODUCT', 'ACROSS_TARGET')),
  min_order_amount    NUMERIC,
  starts_at           TIMESTAMPTZ DEFAULT NOW(),
  ends_at             TIMESTAMPTZ,
  usage_count         INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auto_discounts_active ON public.automatic_discounts (is_active);
CREATE INDEX IF NOT EXISTS idx_auto_discounts_dates  ON public.automatic_discounts (starts_at, ends_at);

-- RLS: public (anon) can read active rules so client-side math works without auth
ALTER TABLE public.automatic_discounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auto_discounts_public_read" ON public.automatic_discounts;
CREATE POLICY "auto_discounts_public_read" ON public.automatic_discounts
  FOR SELECT
  USING (
    is_active = true
    AND starts_at <= NOW()
    AND (ends_at IS NULL OR ends_at > NOW())
  );

DROP POLICY IF EXISTS "auto_discounts_admin_all" ON public.automatic_discounts;
CREATE POLICY "auto_discounts_admin_all" ON public.automatic_discounts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('admin', 'owner')
    )
  );

-- ── Orders table extension (additive / nullable) ──────────────────────────────

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS auto_discount_title  TEXT,
  ADD COLUMN IF NOT EXISTS auto_discount_amount NUMERIC DEFAULT 0;
