-- ============================================================
-- Put the unresolved-variant guard on the POS reservation function the till
-- actually calls.
--
-- 20260822130000 added the guard to fn_reserve_pos_stock(uuid, jsonb) — the
-- two-argument signature from 20260723030000. But 20260724030000 had since
-- added a three-argument overload carrying p_ttl_mins, and that is the one
-- /api/pos/send-link invokes. So the guard went onto a function nothing calls
-- and the till kept its ability to reserve a variant-tracked product against
-- the pooled product roll-up.
--
-- Both overloads are now guarded, so it does not matter which one a caller
-- resolves to. Neither is dropped: the two-argument form is left in place
-- rather than removed, and guarding both is what makes the ambiguity harmless.
--
-- Additive: one function replaced, signature and default unchanged.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_reserve_pos_stock(
    p_session_id UUID,
    p_items      JSONB,
    p_ttl_mins   INTEGER DEFAULT 15
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
    exp_at    TIMESTAMPTZ := NOW() + (p_ttl_mins || ' minutes')::INTERVAL;
BEGIN
    -- Clear existing reservations for this session (handles the resend flow)
    DELETE FROM public.pos_reservations WHERE pos_session_id = p_session_id;

    -- Collapse duplicate lines, then lock in a globally consistent order.
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

        -- A variant-tracked product must name a variant. Without this the till
        -- is measured against fn_available_stock(p_id, NULL) — the product
        -- roll-up, which is every colour and size added together — and can sell
        -- a variant that holds nothing.
        IF v_id IS NULL AND EXISTS (
            SELECT 1 FROM public.products WHERE id = p_id AND track_variant_inventory = TRUE
        ) THEN
            RAISE EXCEPTION 'Variant not recognised for product: % (available: 0, requested: %)', p_id, qty;
        END IF;

        -- A variant id naming no row is the same failure wearing a UUID.
        IF v_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM public.product_variants WHERE id = v_id AND product_id = p_id
        ) THEN
            RAISE EXCEPTION 'Variant not recognised for product: % (available: 0, requested: %)', p_id, qty;
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
