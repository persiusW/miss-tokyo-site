-- ============================================================
-- POS: configurable hold window + fully-discounted orders
--
-- 1. The 30-minute stock hold was hardcoded inside fn_reserve_pos_stock, so
--    the number the customer is told in the email/SMS and the number the DB
--    actually enforces could drift apart. It becomes a parameter, defaulting
--    to the new 15 minutes, and the application passes it explicitly from a
--    single constant so the message and the hold can never disagree.
--
-- 2. total_amount CHECK (> 0) made a fully gift-card-covered sale impossible
--    to record — there is nothing to charge. Relaxed to >= 0. This widens what
--    is accepted; no existing row can violate it.
-- ============================================================

-- 1. Allow a zero-value session (gift card covers the whole basket)
ALTER TABLE public.pos_sessions
    DROP CONSTRAINT IF EXISTS pos_sessions_total_amount_check;

ALTER TABLE public.pos_sessions
    ADD CONSTRAINT pos_sessions_total_amount_check CHECK (total_amount >= 0);

-- 2. Hold window becomes a parameter (mirrors fn_reserve_online_stock's p_ttl_mins)
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
