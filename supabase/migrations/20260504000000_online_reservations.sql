-- ============================================================
-- Inventory Hardening: Online Reservation Layer
-- ============================================================

-- 1. online_reservations table (mirrors pos_reservations pattern)
CREATE TABLE public.online_reservations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id  UUID NOT NULL REFERENCES public.products(id),
    variant_id  UUID REFERENCES public.product_variants(id),
    quantity    INTEGER NOT NULL CHECK (quantity > 0),
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX ON public.online_reservations (product_id, variant_id, order_id) NULLS NOT DISTINCT;
CREATE INDEX ON public.online_reservations (expires_at);
CREATE INDEX ON public.online_reservations (order_id);

ALTER TABLE public.online_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_online_reservations"
    ON public.online_reservations FOR SELECT
    TO authenticated
    USING (true);

-- 2. fn_combined_available_stock: available = on_hand - POS holds - online holds
CREATE OR REPLACE FUNCTION public.fn_combined_available_stock(
    p_product_id UUID,
    p_variant_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE sql STABLE AS $$
    SELECT
        CASE WHEN p_variant_id IS NULL
            THEN COALESCE((SELECT inventory_count FROM public.products WHERE id = p_product_id), 0)
            ELSE COALESCE((SELECT inventory_count FROM public.product_variants WHERE id = p_variant_id), 0)
        END
        -- subtract active POS reservations
        - COALESCE((
            SELECT SUM(r.quantity)
            FROM public.pos_reservations r
            JOIN public.pos_sessions s ON s.id = r.pos_session_id
            WHERE (
                (p_variant_id IS NULL AND r.product_id = p_product_id AND r.variant_id IS NULL)
                OR r.variant_id = p_variant_id
            )
            AND r.expires_at > NOW()
            AND s.status = 'pending_payment'
        ), 0)
        -- subtract active online reservations
        - COALESCE((
            SELECT SUM(r.quantity)
            FROM public.online_reservations r
            JOIN public.orders o ON o.id = r.order_id
            WHERE (
                (p_variant_id IS NULL AND r.product_id = p_product_id AND r.variant_id IS NULL)
                OR r.variant_id = p_variant_id
            )
            AND r.expires_at > NOW()
            AND o.status = 'pending'
        ), 0);
$$;

-- 3. fn_reserve_online_stock: atomic hold for online checkout
-- p_items format: [{"product_id":"uuid","variant_id":"uuid|null","quantity":1}, ...]
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
    -- Clear any existing reservations for this order (idempotent re-init)
    DELETE FROM public.online_reservations WHERE order_id = p_order_id;

    -- Sort by product_id before acquiring row locks.
    -- Without a consistent order, two sessions locking [A, B] and [B, A] simultaneously
    -- will deadlock. Sorting by product_id guarantees every session acquires locks in the
    -- same global sequence, making a deadlock mathematically impossible.
    FOR item IN SELECT value FROM jsonb_array_elements(p_items) ORDER BY (value->>'product_id')
    LOOP
        p_id := (item->>'product_id')::UUID;
        v_id := CASE
                    WHEN (item->'variant_id') IS NULL OR (item->'variant_id') = 'null'::jsonb THEN NULL
                    ELSE (item->>'variant_id')::UUID
                END;
        qty  := (item->>'quantity')::INTEGER;

        -- Re-verify product is active (server-side; don't trust client)
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

        -- Row-level lock to prevent concurrent reservation races
        IF v_id IS NOT NULL THEN
            PERFORM 1 FROM public.product_variants WHERE id = v_id FOR UPDATE;
        ELSE
            PERFORM 1 FROM public.products WHERE id = p_id FOR UPDATE;
        END IF;

        -- Available = on_hand - POS holds - existing online holds
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

-- 4. Update fn_available_stock to delegate to fn_combined_available_stock.
--    Keeps all existing POS code working unchanged while adding online hold awareness.
CREATE OR REPLACE FUNCTION public.fn_available_stock(
    p_product_id UUID,
    p_variant_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE sql STABLE AS $$
    SELECT public.fn_combined_available_stock(p_product_id, p_variant_id);
$$;
