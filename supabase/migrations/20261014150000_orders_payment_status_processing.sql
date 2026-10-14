-- /api/paystack/verify and the reconcile path claim an order by moving
-- payment_status pending → processing before deducting stock, then
-- processing → paid. The CHECK never allowed 'processing', so that claim has
-- always failed and only the webhook has ever settled an order. Widening it
-- lets verify (the customer's return from Paystack) and reconcile settle too.
-- Swapped in one migration (one transaction); every existing row still passes.
-- An order left in 'processing' by a crash is picked up by the
-- sync-payment-status cron, which already handles it.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'refunded'::text, 'cancelled'::text, 'processing'::text]));
