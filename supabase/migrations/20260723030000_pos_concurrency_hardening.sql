-- ============================================================
-- POS concurrency hardening — brings fn_reserve_pos_stock up to the
-- standard fn_reserve_online_stock was raised to in 20260504000000.
-- The online path was hardened; POS was never back-ported.
--
-- Fixes, in severity order:
--   1. Unique index ignored variant_id, so a cart holding two variants of
--      the same product (two sizes — routine during a sale) failed to
--      reserve with a raw unique-violation error.
--   2. No deterministic lock order, so two tills reserving the same two
--      products in opposite order could deadlock.
--   3. No is_active re-check: the till could sell a de-listed product.
--   4. No preorder bypass: preorder products can never satisfy the stock
--      check, so POS could not sell them at all.
--   5. Duplicate (product, variant) lines in one cart collided instead of
--      summing.
-- ============================================================

-- 1. Reservation uniqueness must be per variant, matching online_reservations.
--
--    NOTE ON THE "DESTRUCTIVE OPERATION" WARNING: Supabase flags any DROP.
--    The only DROP here is of an INDEX — indexes hold no data, they are derived
--    structures rebuilt from the table. No row, column, table or constraint is
--    removed and nothing in pos_reservations is altered.
--
--    The new index is created FIRST under its own name, so uniqueness is never
--    absent even momentarily, and the old one is dropped only once the
--    replacement is in place.
CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_reservations_no_duplicate_v2
    ON public.pos_reservations (product_id, variant_id, pos_session_id) NULLS NOT DISTINCT;

DROP INDEX IF EXISTS public.idx_pos_reservations_no_duplicate;

-- 2. Harden the reservation function
CREATE OR REPLACE FUNCTION public.fn_reserve_pos_stock(
    p_session_id UUID,
    p_items      JSONB
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    item      JSONB;
    p_id      UUID;
    v_id      UUID;
    qty       INTEGER;
    available INTEGER;
    exp_at    TIMESTAMPTZ := NOW() + INTERVAL '30 minutes';
BEGIN
    -- Clear existing reservations for this session (handles the resend flow)
    DELETE FROM public.pos_reservations WHERE pos_session_id = p_session_id;

    -- Collapse duplicate lines, then lock in a globally consistent order.
    -- Without the ORDER BY, two tills locking [A,B] and [B,A] at the same
    -- moment deadlock; sorting makes that impossible.
    FOR item IN
        SELECT jsonb_build_object(
                   'product_id', value ->> 'product_id',
                   'variant_id', value -> 'variant_id',
                   'quantity',   SUM((value ->> 'quantity')::INTEGER)
               )
        FROM jsonb_array_elements(p_items)
        GROUP BY value ->> 'product_id', value -> 'variant_id'
        ORDER BY value ->> 'product_id', value -> 'variant_id'
    LOOP
        p_id := (item ->> 'product_id')::UUID;
        v_id := CASE WHEN (item -> 'variant_id') IS NULL OR (item -> 'variant_id') = 'null'::jsonb
                     THEN NULL
                     ELSE (item ->> 'variant_id')::UUID
                END;
        qty  := (item ->> 'quantity')::INTEGER;

        -- Re-verify the product is sellable; never trust the till's copy
        IF NOT EXISTS (
            SELECT 1 FROM public.products
            WHERE id = p_id AND (is_active IS NULL OR is_active = TRUE)
        ) THEN
            RAISE EXCEPTION 'Product % is not available', p_id;
        END IF;

        -- Pre-order items hold no stock
        IF EXISTS (SELECT 1 FROM public.products WHERE id = p_id AND preorder_enabled = TRUE) THEN
            CONTINUE;
        END IF;

        IF v_id IS NOT NULL THEN
            PERFORM 1 FROM public.product_variants WHERE id = v_id FOR UPDATE;
        ELSE
            PERFORM 1 FROM public.products WHERE id = p_id FOR UPDATE;
        END IF;

        -- Nets off both POS and online holds
        available := public.fn_available_stock(p_id, v_id);

        IF available < qty THEN
            RAISE EXCEPTION 'Insufficient stock for product: % (available: %, requested: %)',
                p_id, available, qty;
        END IF;

        INSERT INTO public.pos_reservations
            (pos_session_id, product_id, variant_id, quantity, expires_at)
        VALUES
            (p_session_id, p_id, v_id, qty, exp_at);
    END LOOP;

    UPDATE public.pos_sessions
    SET status = 'pending_payment', expires_at = exp_at
    WHERE id = p_session_id;
END;
$$;

-- 3. Batched availability for the till's product grid. One round trip for the
--    whole page instead of one per product.
CREATE OR REPLACE FUNCTION public.fn_available_stock_bulk(p_product_ids UUID[])
RETURNS TABLE (product_id UUID, available INTEGER)
LANGUAGE sql STABLE AS $$
    SELECT p.id, public.fn_combined_available_stock(p.id, NULL)
    FROM public.products p
    WHERE p.id = ANY(p_product_ids);
$$;

-- 3b. Batched availability for arbitrary (product, variant) pairs, so the cart
--     and checkout pre-checks can net off live holds in one round trip instead
--     of reading raw inventory_count.
--     p_items: [{"product_id":"uuid","variant_id":"uuid|null"}, ...]
CREATE OR REPLACE FUNCTION public.fn_available_stock_batch(p_items JSONB)
RETURNS TABLE (product_id UUID, variant_id UUID, available INTEGER)
LANGUAGE sql STABLE AS $$
    SELECT
        (i.value ->> 'product_id')::UUID,
        CASE WHEN (i.value -> 'variant_id') IS NULL OR (i.value -> 'variant_id') = 'null'::jsonb
             THEN NULL
             ELSE (i.value ->> 'variant_id')::UUID
        END,
        public.fn_combined_available_stock(
            (i.value ->> 'product_id')::UUID,
            CASE WHEN (i.value -> 'variant_id') IS NULL OR (i.value -> 'variant_id') = 'null'::jsonb
                 THEN NULL
                 ELSE (i.value ->> 'variant_id')::UUID
            END
        )
    FROM jsonb_array_elements(p_items) AS i(value);
$$;

-- 4. Atomic inventory decrement — replaces the webhook's read-modify-write,
--    which lost updates when two orders for the same product settled together.
CREATE OR REPLACE FUNCTION public.fn_decrement_stock(
    p_product_id UUID,
    p_variant_id UUID DEFAULT NULL,
    p_quantity   INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_variant_id IS NOT NULL THEN
        UPDATE public.product_variants
        SET inventory_count = GREATEST(0, COALESCE(inventory_count, 0) - p_quantity)
        WHERE id = p_variant_id;
    END IF;

    UPDATE public.products
    SET inventory_count = GREATEST(0, COALESCE(inventory_count, 0) - p_quantity)
    WHERE id = p_product_id;
END;
$$;
