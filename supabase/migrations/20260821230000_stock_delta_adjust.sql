-- ============================================================
-- Stock edits become deltas instead of absolute overwrites.
--
-- The admin product form loaded every variant count when the page opened and
-- posted those same numbers back on save. Any sale that settled in between was
-- overwritten, so stock climbed back up on its own and the same unit sold
-- twice. A delta cannot lose a concurrent sale: the sale and the edit both
-- land, in either order.
--
-- Additive only. Two new functions, no table, column or constraint touched.
-- ============================================================

-- 1. Apply a signed adjustment. Mirrors fn_decrement_stock: the variant row and
--    the product-level roll-up move together, in one UPDATE each, so the row
--    lock serialises concurrent writers instead of letting them race.
CREATE OR REPLACE FUNCTION public.fn_adjust_stock(
    p_product_id UUID,
    p_variant_id UUID DEFAULT NULL,
    p_delta      INTEGER DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_delta = 0 THEN
        RETURN;
    END IF;

    IF p_variant_id IS NOT NULL THEN
        UPDATE public.product_variants
        SET inventory_count = GREATEST(0, COALESCE(inventory_count, 0) + p_delta)
        WHERE id = p_variant_id;
    END IF;

    UPDATE public.products
    SET inventory_count = GREATEST(0, COALESCE(inventory_count, 0) + p_delta)
    WHERE id = p_product_id;
END;
$$;

-- 2. True up the product-level roll-up from the variant rows.
--
--    Needed after a save adds or removes variant rows, and it repairs products
--    left at the 9999 "not tracked" sentinel by the old form, which made them
--    read as unlimited stock.
--
--    The product row is locked first so a concurrent fn_decrement_stock queues
--    behind this instead of interleaving. A decrement that already committed
--    its variant UPDATE before we summed will subtract from the product again
--    once we release the lock, leaving the roll-up one low until the next sync.
--    Erring low is the safe direction — it can never oversell.
CREATE OR REPLACE FUNCTION public.fn_sync_product_stock_from_variants(
    p_product_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_sum INTEGER;
BEGIN
    PERFORM 1 FROM public.products WHERE id = p_product_id FOR UPDATE;

    SELECT COALESCE(SUM(GREATEST(0, COALESCE(inventory_count, 0))), 0)
    INTO v_sum
    FROM public.product_variants
    WHERE product_id = p_product_id;

    UPDATE public.products
    SET inventory_count = v_sum
    WHERE id = p_product_id;

    RETURN v_sum;
END;
$$;
