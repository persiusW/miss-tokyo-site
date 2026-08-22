-- ============================================================
-- Cash payments at the till.
--
-- Walk-in customers pay at the counter. Until now the only way to record that
-- was to edit the product and reduce its stock by hand, which is exactly the
-- habit that reverted stock and oversold items on 2026-08-21.
--
-- A cash sale settles through the same settlePosSession path a gift-card sale
-- already uses. These columns are what the reporting side needs to tell cash
-- apart from card afterwards.
--
-- Additive only: three new columns, no table, constraint or existing column
-- touched. Postgres backfills every existing row with the DEFAULT, so history
-- reads as 'paystack' — correct for all but the handful of gift-card-covered
-- POS sales, which the data cannot distinguish retrospectively.
-- ============================================================

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'paystack';

-- Who took the money. Cash leaves no gateway record, so the order row is the
-- only proof the sale happened — end-of-day counting needs a name against it.
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS recorded_by UUID;

ALTER TABLE public.pos_sessions
    ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'paystack';

-- Filtering the orders page by method, and the analytics split, both scan on
-- this. Partial index: 'paystack' is the overwhelming majority and never worth
-- an index lookup.
CREATE INDEX IF NOT EXISTS idx_orders_payment_method_created
    ON public.orders (payment_method, created_at DESC)
    WHERE payment_method <> 'paystack';

-- The orders page date picker filters on created_at across all methods.
CREATE INDEX IF NOT EXISTS idx_orders_created_at
    ON public.orders (created_at DESC);

COMMENT ON COLUMN public.orders.payment_method IS
    'How the sale was paid: paystack | cash | gift_card. Cash is taken at the till by POS staff and settles with no gateway record.';
COMMENT ON COLUMN public.orders.recorded_by IS
    'Staff profile id that settled a cash sale. Null for gateway-paid orders, which carry their own proof.';
