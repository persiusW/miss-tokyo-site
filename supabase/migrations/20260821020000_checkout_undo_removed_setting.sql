-- ============================================================
-- Checkout: optional Undo on auto-removed cart lines
--
-- When an item in the cart turns out to be unavailable, checkout now
-- removes it automatically and shows a highlighted "removed" row. Whether
-- that row offers an Undo is a staff decision: restoring is useful when a
-- line was dropped over a temporary stock hold that has since expired, but
-- it also hands the customer a control that can confuse.
--
-- Defaults to false, so behaviour is unchanged until staff turn it on in
-- Settings → Store.
--
-- Additive: one column with a default. No table is rewritten in a way that
-- changes existing values, and nothing is dropped.
--
-- Safe to run more than once.
-- ============================================================

ALTER TABLE public.store_settings
    ADD COLUMN IF NOT EXISTS checkout_undo_removed_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.store_settings.checkout_undo_removed_enabled IS
    'When true, checkout offers Undo on a cart line auto-removed for unavailability.';
