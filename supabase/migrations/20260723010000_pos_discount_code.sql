-- ============================================================
-- POS: gift card / discount code support (additive)
-- Staff can apply a coupon or gift card at the till, matching
-- what a customer can do for themselves at checkout.
--
-- Only the CODE is ever accepted from the client. The amount is
-- recomputed server-side in /api/pos/send-link via
-- validateDiscountCode() and written back to these columns, so
-- the webhook settles from server-verified values.
-- ============================================================

ALTER TABLE public.pos_sessions
    ADD COLUMN IF NOT EXISTS discount_code TEXT;

ALTER TABLE public.pos_sessions
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE public.pos_sessions
    ADD COLUMN IF NOT EXISTS discount_tag TEXT;

-- Recreate the value guard idempotently (constraint only, no data touched)
ALTER TABLE public.pos_sessions
    DROP CONSTRAINT IF EXISTS pos_sessions_discount_tag_check;

ALTER TABLE public.pos_sessions
    ADD CONSTRAINT pos_sessions_discount_tag_check
        CHECK (discount_tag IS NULL OR discount_tag IN ('coupon', 'gift_card'));
