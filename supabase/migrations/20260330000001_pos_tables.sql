-- ============================================================
-- POS Feature: Additive migration
-- ============================================================

-- 1. pos_sessions table
CREATE TABLE IF NOT EXISTS public.pos_sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by          UUID NOT NULL REFERENCES auth.users(id),
    customer_name       TEXT NOT NULL,
    customer_email      TEXT NOT NULL,
    customer_phone      TEXT,
    customer_address    TEXT,
    contact_id          UUID REFERENCES public.contacts(id),
    items               JSONB NOT NULL DEFAULT '[]',
    total_amount        NUMERIC NOT NULL CHECK (total_amount > 0),
    status              TEXT NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','pending_payment','paid','expired','cancelled')),
    paystack_reference  TEXT,
    expires_at          TIMESTAMPTZ,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at             TIMESTAMPTZ,
    order_id            UUID REFERENCES public.orders(id)
);

CREATE INDEX IF NOT EXISTS idx_pos_sessions_status_expires
    ON public.pos_sessions (status, expires_at);

-- RLS: deny all public access — server uses supabaseAdmin (service role bypasses RLS)
ALTER TABLE public.pos_sessions ENABLE ROW LEVEL SECURITY;

-- 2. pos_reservations table
CREATE TABLE IF NOT EXISTS public.pos_reservations (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pos_session_id   UUID NOT NULL REFERENCES public.pos_sessions(id) ON DELETE CASCADE,
    product_id       UUID NOT NULL REFERENCES public.products(id),
    variant_id       UUID REFERENCES public.product_variants(id),
    quantity         INTEGER NOT NULL CHECK (quantity > 0),
    expires_at       TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pos_reservations_product_expires
    ON public.pos_reservations (product_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_pos_reservations_session
    ON public.pos_reservations (pos_session_id);

-- Simple unique index — fn_reserve_pos_stock deletes old reservations before re-inserting,
-- so a static partial predicate is not needed and would be incorrect (NOW() is evaluated once at DDL time).
CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_reservations_no_duplicate
    ON public.pos_reservations (product_id, pos_session_id);

ALTER TABLE public.pos_reservations ENABLE ROW LEVEL SECURITY;

-- RLS policies: authenticated users (logged-in staff) can SELECT; service role bypasses RLS for writes
CREATE POLICY "staff_select_pos_sessions"
    ON public.pos_sessions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "staff_select_pos_reservations"
    ON public.pos_reservations FOR SELECT
    TO authenticated
    USING (true);

-- 3. fn_available_stock: returns stock minus active reservations
CREATE OR REPLACE FUNCTION public.fn_available_stock(
    p_product_id UUID,
    p_variant_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
    SELECT CASE
        WHEN p_variant_id IS NULL THEN
            COALESCE((SELECT inventory_count FROM public.products WHERE id = p_product_id), 0)
            - COALESCE((
                SELECT SUM(r.quantity)
                FROM public.pos_reservations r
                JOIN public.pos_sessions s ON s.id = r.pos_session_id
                WHERE r.product_id = p_product_id
                  AND r.variant_id IS NULL
                  AND r.expires_at > NOW()
                  AND s.status = 'pending_payment'
            ), 0)
        ELSE
            COALESCE((SELECT inventory_count FROM public.product_variants WHERE id = p_variant_id), 0)
            - COALESCE((
                SELECT SUM(r.quantity)
                FROM public.pos_reservations r
                JOIN public.pos_sessions s ON s.id = r.pos_session_id
                WHERE r.variant_id = p_variant_id
                  AND r.expires_at > NOW()
                  AND s.status = 'pending_payment'
            ), 0)
    END;
$$;

-- 4. fn_reserve_pos_stock: atomic reservation with row-level lock
-- p_items format: [{"product_id":"uuid","variant_id":"uuid|null","quantity":1}, ...]
CREATE OR REPLACE FUNCTION public.fn_reserve_pos_stock(
    p_session_id UUID,
    p_items      JSONB
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    item        JSONB;
    p_id        UUID;
    v_id        UUID;
    qty         INTEGER;
    available   INTEGER;
    exp_at      TIMESTAMPTZ := NOW() + INTERVAL '30 minutes';
BEGIN
    -- Step 1: Delete any existing reservations for this session (handles resend flow)
    DELETE FROM public.pos_reservations WHERE pos_session_id = p_session_id;

    -- Step 2: For each item, lock row, check stock, insert reservation
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        p_id := (item->>'product_id')::UUID;
        -- JSON null-safe extraction (handles both JSON null and missing key)
        v_id := CASE WHEN (item->'variant_id') IS NULL OR (item->'variant_id') = 'null'::jsonb
                     THEN NULL
                     ELSE (item->>'variant_id')::UUID
                END;
        qty  := (item->>'quantity')::INTEGER;

        IF v_id IS NOT NULL THEN
            -- Lock variant row
            PERFORM 1 FROM public.product_variants WHERE id = v_id FOR UPDATE;
        ELSE
            -- Lock product row
            PERFORM 1 FROM public.products WHERE id = p_id FOR UPDATE;
        END IF;

        -- Check available stock
        available := public.fn_available_stock(p_id, v_id);

        IF available < qty THEN
            RAISE EXCEPTION 'Insufficient stock for product: %', p_id;
        END IF;

        INSERT INTO public.pos_reservations
            (pos_session_id, product_id, variant_id, quantity, expires_at)
        VALUES
            (p_session_id, p_id, v_id, qty, exp_at);
    END LOOP;

    -- Step 3: Update session to pending_payment with expiry
    UPDATE public.pos_sessions
    SET status = 'pending_payment', expires_at = exp_at
    WHERE id = p_session_id;
END;
$$;

-- 5. Add source column to orders (additive, safe default)
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'storefront';
