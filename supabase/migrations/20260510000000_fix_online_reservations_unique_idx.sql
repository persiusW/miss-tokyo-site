-- Fix unique constraint to allow multiple variants of the same product per order.
-- Old index only covered (product_id, order_id) which blocked e.g. M-10 + L-12
-- of the same product in a single checkout.
DROP INDEX IF EXISTS public.online_reservations_product_order_idx;

CREATE UNIQUE INDEX IF NOT EXISTS online_reservations_product_variant_order_idx
    ON public.online_reservations (product_id, variant_id, order_id)
    NULLS NOT DISTINCT;
