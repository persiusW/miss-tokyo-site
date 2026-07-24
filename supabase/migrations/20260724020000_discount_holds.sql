-- ============================================================
-- Discount holds — closes the apply→settle window for coupons and gift cards.
--
-- Stock has held its value between checkout and settlement since
-- 20260504000000. Discounts never did: a code was CHECKED when applied and the
-- ledger WRITTEN only at settlement, so two tills (or a till and a storefront
-- customer) could pass the same check and both be quoted the same money.
--
-- 20260724000000 made the settlement WRITE safe — a card can no longer be
-- overdrawn, a coupon can no longer pass its cap. This migration stops the
-- second quote being made at all, which is what actually protects the money.
--
-- Mirrors pos_reservations / online_reservations exactly: a hold row with a
-- TTL, and availability functions that subtract live holds. Nothing needs
-- cleaning up for correctness — every read filters on expires_at > NOW().
-- ============================================================

CREATE TABLE IF NOT EXISTS public.discount_holds (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind           TEXT NOT NULL CHECK (kind IN ('coupon', 'gift_card')),
    code_id        UUID NOT NULL,                       -- coupons.id | gift_cards.id
    order_id       UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    pos_session_id UUID REFERENCES public.pos_sessions(id) ON DELETE CASCADE,
    amount         NUMERIC NOT NULL DEFAULT 0 CHECK (amount >= 0),  -- gift cards only
    expires_at     TIMESTAMPTZ NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT discount_holds_owner CHECK (order_id IS NOT NULL OR pos_session_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_discount_holds_code_expiry
    ON public.discount_holds (code_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_discount_holds_order   ON public.discount_holds (order_id);
CREATE INDEX IF NOT EXISTS idx_discount_holds_session ON public.discount_holds (pos_session_id);

-- One live hold per code per basket — re-holding replaces rather than stacks
CREATE UNIQUE INDEX IF NOT EXISTS idx_discount_holds_no_duplicate
    ON public.discount_holds (code_id, order_id, pos_session_id) NULLS NOT DISTINCT;

ALTER TABLE public.discount_holds ENABLE ROW LEVEL SECURITY;

-- Dropped first so the whole migration is re-runnable; CREATE POLICY has no
-- IF NOT EXISTS, and a partial re-run otherwise aborts on 42710.
DROP POLICY IF EXISTS "staff_select_discount_holds" ON public.discount_holds;

CREATE POLICY "staff_select_discount_holds"
    ON public.discount_holds FOR SELECT
    TO authenticated
    USING (true);

-- ── Availability ─────────────────────────────────────────────────────────────

-- Gift card value not already spoken for by a live hold.
CREATE OR REPLACE FUNCTION public.fn_available_gift_card_value(p_card_id UUID)
RETURNS NUMERIC
LANGUAGE sql STABLE AS $$
    SELECT GREATEST(0,
        COALESCE((SELECT remaining_value FROM public.gift_cards WHERE id = p_card_id), 0)
        - COALESCE((
            SELECT SUM(h.amount)
            FROM public.discount_holds h
            WHERE h.code_id = p_card_id
              AND h.kind = 'gift_card'
              AND h.expires_at > NOW()
        ), 0)
    );
$$;

-- Coupon uses left after live holds. NULL means unlimited.
CREATE OR REPLACE FUNCTION public.fn_available_coupon_uses(p_coupon_id UUID)
RETURNS INTEGER
LANGUAGE sql STABLE AS $$
    SELECT CASE
        WHEN (SELECT usage_limit FROM public.coupons WHERE id = p_coupon_id) IS NULL THEN NULL
        ELSE GREATEST(0,
            (SELECT usage_limit FROM public.coupons WHERE id = p_coupon_id)
            - COALESCE((SELECT used_count FROM public.coupons WHERE id = p_coupon_id), 0)
            - COALESCE((
                SELECT COUNT(*)
                FROM public.discount_holds h
                WHERE h.code_id = p_coupon_id
                  AND h.kind = 'coupon'
                  AND h.expires_at > NOW()
            ), 0)
        )::INTEGER
    END;
$$;

-- ── Placing and releasing ────────────────────────────────────────────────────

/**
 * Places a hold, refusing if the code cannot cover it.
 * Exactly one of p_order_id / p_pos_session_id should be supplied.
 * Raises on insufficient value so callers fail closed, like stock reservation.
 */
CREATE OR REPLACE FUNCTION public.fn_hold_discount(
    p_kind           TEXT,
    p_code_id        UUID,
    p_amount         NUMERIC,
    p_order_id       UUID DEFAULT NULL,
    p_pos_session_id UUID DEFAULT NULL,
    p_ttl_mins       INTEGER DEFAULT 30
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    exp_at    TIMESTAMPTZ := NOW() + (p_ttl_mins || ' minutes')::INTERVAL;
    available NUMERIC;
    uses_left INTEGER;
BEGIN
    IF p_order_id IS NULL AND p_pos_session_id IS NULL THEN
        RAISE EXCEPTION 'fn_hold_discount requires an order or a POS session';
    END IF;

    -- Drop this basket's previous hold on this code so re-sending replaces it
    DELETE FROM public.discount_holds
    WHERE code_id = p_code_id
      AND order_id IS NOT DISTINCT FROM p_order_id
      AND pos_session_id IS NOT DISTINCT FROM p_pos_session_id;

    IF p_kind = 'gift_card' THEN
        -- Lock the card so two concurrent holds cannot both see the same balance
        PERFORM 1 FROM public.gift_cards WHERE id = p_code_id FOR UPDATE;

        available := public.fn_available_gift_card_value(p_code_id);
        IF available < p_amount THEN
            RAISE EXCEPTION 'Gift card has only % left (requested %)', available, p_amount;
        END IF;

    ELSIF p_kind = 'coupon' THEN
        PERFORM 1 FROM public.coupons WHERE id = p_code_id FOR UPDATE;

        uses_left := public.fn_available_coupon_uses(p_code_id);
        IF uses_left IS NOT NULL AND uses_left < 1 THEN
            RAISE EXCEPTION 'Coupon has no uses left';
        END IF;

    ELSE
        RAISE EXCEPTION 'Unknown discount kind: %', p_kind;
    END IF;

    INSERT INTO public.discount_holds (kind, code_id, order_id, pos_session_id, amount, expires_at)
    VALUES (p_kind, p_code_id, p_order_id, p_pos_session_id, COALESCE(p_amount, 0), exp_at);
END;
$$;

/** Releases holds for a basket — called once the ledger has been written, or on cancel. */
CREATE OR REPLACE FUNCTION public.fn_release_discount_holds(
    p_order_id       UUID DEFAULT NULL,
    p_pos_session_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE sql AS $$
    DELETE FROM public.discount_holds
    WHERE (p_order_id IS NOT NULL AND order_id = p_order_id)
       OR (p_pos_session_id IS NOT NULL AND pos_session_id = p_pos_session_id);
$$;
