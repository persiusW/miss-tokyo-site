-- Add updated_at column to orders table
-- Fixes the cron job that has been failing every hour since March 20:
--   UPDATE orders SET status='fulfilled', updated_at=NOW()
--   WHERE status='shipped' AND updated_at <= NOW() - INTERVAL '24 hours'
-- The column did not exist, causing the cron to silently skip all auto-fulfillment.

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill existing rows: use created_at as a safe baseline
UPDATE public.orders
SET updated_at = created_at
WHERE updated_at IS NULL;

-- Trigger to auto-update updated_at on any row change
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_updated_at ON public.orders;
CREATE TRIGGER orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
