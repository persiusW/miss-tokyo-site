-- ============================================================
-- POS: allow a sale with no customer email (walk-in trade)
--
-- Additive and permissive only. Nothing is dropped, no data is
-- touched, and every existing row stays exactly as it is — this
-- only stops the database refusing NULL in two columns.
--
-- Reversible: ALTER TABLE ... ALTER COLUMN ... SET NOT NULL,
-- provided no NULL rows have been written in the meantime.
--
-- Safe to run more than once.
-- ============================================================

-- 1. pos_sessions.customer_email — created NOT NULL in 20260330000001_pos_tables.sql.
--    A walk-in who gives only a phone number now stores NULL here; the payment
--    link reaches them by SMS, and Paystack is initialised against the store's
--    own address (see src/lib/posContact.ts).
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'pos_sessions'
          AND column_name  = 'customer_email'
          AND is_nullable  = 'NO'
    ) THEN
        ALTER TABLE public.pos_sessions ALTER COLUMN customer_email DROP NOT NULL;
        RAISE NOTICE 'pos_sessions.customer_email is now nullable';
    ELSE
        RAISE NOTICE 'pos_sessions.customer_email was already nullable — nothing to do';
    END IF;
END $$;

-- 2. orders.customer_email — settled POS orders inherit the null.
--    Without this the settlement path falls back to recording the walk-in under
--    the store's address, which still works but muddies the store's own order
--    history. Guarded because this column's current state is not in migration
--    history (the orders table predates it).
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'orders'
          AND column_name  = 'customer_email'
          AND is_nullable  = 'NO'
    ) THEN
        ALTER TABLE public.orders ALTER COLUMN customer_email DROP NOT NULL;
        RAISE NOTICE 'orders.customer_email is now nullable';
    ELSE
        RAISE NOTICE 'orders.customer_email was already nullable — nothing to do';
    END IF;
END $$;
