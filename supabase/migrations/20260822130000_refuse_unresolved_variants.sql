-- ============================================================
-- Refuse to reserve a variant-tracked product without a variant row.
--
-- fn_combined_available_stock(product, NULL) returns the product roll-up, which
-- is every colour and size added together. A line that failed to resolve to a
-- variant passed NULL, was measured against that pooled number, and reserved
-- happily — then decremented the roll-up alone at settlement. That is how a
-- colour with no stock, and in several cases a colour with no variant row at
-- all, kept selling: 109 paid lines, 111 units, across five months.
--
-- The application refuses this first (checkStock returns VARIANT_UNAVAILABLE).
-- This is the layer underneath, so a caller that skips the check, or a future
-- one that forgets it, still cannot oversell.
--
-- Verified safe before writing: no active variant-tracked product has zero
-- variant rows, and none is on preorder, so nothing currently sellable starts
-- being refused. Existing reservation rows are untouched — only new
-- reservations are checked.
--
-- Additive: two functions replaced, signatures unchanged.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_reserve_online_stock(
    p_order_id  UUID,
    p_items     JSONB,
    p_ttl_mins  INTEGER DEFAULT 30
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
    DELETE FROM public.online_reservations WHERE order_id = p_order_id;

    -- Sort by product_id before acquiring row locks. Without a consistent
    -- order, two sessions locking [A, B] and [B, A] simultaneously deadlock.
    FOR item IN SELECT value FROM jsonb_array_elements(p_items) ORDER BY (value->>'product_id')
    LOOP
        p_id := (item->>'product_id')::UUID;
        v_id := CASE
                    WHEN (item->'variant_id') IS NULL OR (item->'variant_id') = 'null'::jsonb THEN NULL
                    ELSE (item->>'variant_id')::UUID
                END;
        qty  := (item->>'quantity')::INTEGER;

        IF NOT EXISTS (
            SELECT 1 FROM public.products
            WHERE id = p_id AND (is_active IS NULL OR is_active = TRUE)
        ) THEN
            RAISE EXCEPTION 'Product % is not available', p_id;
        END IF;

        -- Pre-order items: no stock lock needed
        IF EXISTS (SELECT 1 FROM public.products WHERE id = p_id AND preorder_enabled = TRUE) THEN
            CONTINUE;
        END IF;

        -- A variant-tracked product must name a variant. Measuring it against
        -- the roll-up instead is the oversell this migration exists to stop.
        IF v_id IS NULL AND EXISTS (
            SELECT 1 FROM public.products WHERE id = p_id AND track_variant_inventory = TRUE
        ) THEN
            RAISE EXCEPTION 'Variant not recognised for product: % (available: 0, requested: %)', p_id, qty;
        END IF;

        -- A variant id that names no row is the same failure wearing a UUID.
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

        available := public.fn_combined_available_stock(p_id, v_id);

        IF available < qty THEN
            RAISE EXCEPTION 'Insufficient stock for product: % (available: %, requested: %)',
                p_id, available, qty;
        END IF;

        INSERT INTO public.online_reservations
            (order_id, product_id, variant_id, quantity, expires_at)
        VALUES
            (p_order_id, p_id, v_id, qty, exp_at);
    END LOOP;
END;
$$;


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
    DELETE FROM public.pos_reservations WHERE pos_session_id = p_session_id;

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

        IF NOT EXISTS (
            SELECT 1 FROM public.products
            WHERE id = p_id AND (is_active IS NULL OR is_active = TRUE)
        ) THEN
            RAISE EXCEPTION 'Product % is not available', p_id;
        END IF;

        IF EXISTS (SELECT 1 FROM public.products WHERE id = p_id AND preorder_enabled = TRUE) THEN
            CONTINUE;
        END IF;

        -- Same guard as the online path. send-link resolves the variant before
        -- it gets here; if that ever fails the till must refuse the line rather
        -- than sell against the pooled roll-up.
        IF v_id IS NULL AND EXISTS (
            SELECT 1 FROM public.products WHERE id = p_id AND track_variant_inventory = TRUE
        ) THEN
            RAISE EXCEPTION 'Variant not recognised for product: % (available: 0, requested: %)', p_id, qty;
        END IF;

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
