-- ============================================================
-- POS: staff-selectable fulfilment method (additive)
-- Previously every POS order was hardcoded to "pickup" when the
-- webhook created the order. Staff now choose pickup or delivery
-- at the till and the choice is carried onto the order.
-- ============================================================

ALTER TABLE public.pos_sessions
    ADD COLUMN IF NOT EXISTS delivery_method TEXT NOT NULL DEFAULT 'pickup';

-- Recreate the value guard idempotently (constraint only, no data touched)
ALTER TABLE public.pos_sessions
    DROP CONSTRAINT IF EXISTS pos_sessions_delivery_method_check;

ALTER TABLE public.pos_sessions
    ADD CONSTRAINT pos_sessions_delivery_method_check
        CHECK (delivery_method IN ('pickup', 'delivery'));
