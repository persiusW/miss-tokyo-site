-- ============================================================
-- Repair: POS "send link" fails with
--   Could not find the function public.fn_reserve_pos_stock(p_items,
--   p_session_id, p_ttl_mins) in the schema cache
--
-- Cause: 20260724010000_pos_hold_ttl_and_zero_total.sql was never applied to
-- production. Every neighbouring POS migration was, so the till runs code that
-- passes p_ttl_mins against a database that still has the two-argument
-- function with a hardcoded 30-minute window. PostgREST finds no match and the
-- reservation — and therefore the whole sale — fails at the till.
--
-- Cause of the follow-on hazard: CREATE OR REPLACE with the new three-argument
-- signature does NOT replace the two-argument function, it adds an overload.
-- With p_ttl_mins defaulted, a two-argument call then matches both and
-- Postgres refuses it as ambiguous. The stale overload is therefore dropped
-- here. Nothing else calls it (src/app/api/pos/send-link/route.ts is the only
-- caller and passes all three), and dropping a superseded function signature
-- touches no data.
--
-- This migration is a replay of 20260724010000 and is safe to run whether or
-- not that file ever landed.
-- ============================================================

-- 1. Allow a zero-value session (gift card covers the whole basket).
--    Widens what is accepted; no existing row can violate it.
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

-- 3. Retire the superseded two-argument signature so the three-argument
--    function is the only candidate PostgREST can resolve to.
DROP FUNCTION IF EXISTS public.fn_reserve_pos_stock(UUID, JSONB);

-- 4. Make PostgREST pick the new signature up immediately rather than at its
--    next scheduled schema reload.
NOTIFY pgrst, 'reload schema';
