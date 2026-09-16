-- ============================================================
-- What Paystack actually charged, kept on the order.
--
-- When the customer bears the transaction fee, Paystack grosses the charge
-- up: the store asks for 461.25 and the customer's phone is debited 470.43.
-- The order row only ever held what the store asked for, so the page showed
-- one figure and Paystack another, and staff read that as a discrepancy.
--
-- Both are stored so the order page can show the full picture without a
-- round trip to Paystack on every load. NULL means "never recorded" — every
-- order that predates this migration, until the Verify button backfills it.
--
-- Additive only: two nullable columns, no default, so the ALTER is a
-- catalogue change and rewrites no rows.
-- ============================================================

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS paystack_charged NUMERIC(12, 2);

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS paystack_fee NUMERIC(12, 2);

COMMENT ON COLUMN public.orders.paystack_charged IS
    'GHS the customer was actually debited (Paystack data.amount). Exceeds total_amount by the fee when the customer bears it.';
COMMENT ON COLUMN public.orders.paystack_fee IS
    'GHS Paystack kept as its transaction fee (Paystack data.fees), whoever bore it.';
