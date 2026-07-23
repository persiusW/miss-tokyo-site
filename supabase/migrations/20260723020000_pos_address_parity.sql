-- ============================================================
-- POS: delivery address parity with storefront checkout (additive)
--
-- The till captured a single free-text address and the webhook wrote it as
-- { "address": ... }, but every reader in the app looks for `text` — so the
-- address rendered blank on order details. Storefront checkout captures
-- text + country + region and writes { text, country, region }.
-- ============================================================

ALTER TABLE public.pos_sessions
    ADD COLUMN IF NOT EXISTS customer_country TEXT;

ALTER TABLE public.pos_sessions
    ADD COLUMN IF NOT EXISTS customer_region TEXT;

-- Repair POS orders already written with the wrong key. Additive: the `text`
-- key is merged in and the original `address` key is left untouched, so this
-- is safe to re-run and loses nothing.
UPDATE public.orders
SET shipping_address = shipping_address || jsonb_build_object('text', shipping_address ->> 'address')
WHERE shipping_address ? 'address'
  AND NOT (shipping_address ? 'text')
  AND NULLIF(TRIM(shipping_address ->> 'address'), '') IS NOT NULL;
