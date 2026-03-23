-- Add missing performance indexes identified from query pattern analysis.
-- All use CONCURRENTLY so there is no table lock on the live database.

-- Paystack webhook variant deduction: composite lookup by product + attributes
-- Previously triggered N queries per order; now a single batch scan uses this index.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_variants_lookup
    ON public.product_variants (product_id, size, color, stitching);

-- Orders: status transitions + abandoned cart window queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status_created
    ON public.orders (status, created_at);

-- Orders: webhook + profile linking lookups by customer email
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_customer_email
    ON public.orders (customer_email);

-- Coupons: case-insensitive code lookup (ilike queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coupons_code_lower
    ON public.coupons (lower(code));

-- Gift cards: case-insensitive code lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gift_cards_code_lower
    ON public.gift_cards (lower(code));

-- Abandoned cart history: dedup check on order_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_abandoned_history_order_id
    ON public.abandoned_history (order_id);
