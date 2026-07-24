-- ============================================================
-- POS hold window becomes a store setting (additive)
--
-- The window was a code constant, so changing it meant a deploy. Staff can now
-- pick it in Settings. Constrained to 15/30/45 so the value can never be
-- something the reservation and the customer's message disagree about, or a
-- number that leaves stock held for an unreasonable stretch during a sale.
-- ============================================================

ALTER TABLE public.store_settings
    ADD COLUMN IF NOT EXISTS pos_hold_minutes INTEGER NOT NULL DEFAULT 15;

ALTER TABLE public.store_settings
    DROP CONSTRAINT IF EXISTS store_settings_pos_hold_minutes_check;

ALTER TABLE public.store_settings
    ADD CONSTRAINT store_settings_pos_hold_minutes_check
        CHECK (pos_hold_minutes IN (15, 30, 45));
