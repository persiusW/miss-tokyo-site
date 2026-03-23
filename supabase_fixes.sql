-- ==============================================================================
-- Supabase Schema Fixes
-- Run this script in the Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Add updated_at to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. Add value to coupons table to prevent insert/update errors
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS value NUMERIC;

-- 3. Ensure abandoned_history has all columns the Next.js cron needs
-- This ensures the abandoning logic doesn't throw 'column does not exist' 
CREATE TABLE IF NOT EXISTS public.abandoned_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    customer_email TEXT,
    customer_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safely add columns if the table already existed but was missing them
ALTER TABLE public.abandoned_history ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE public.abandoned_history ADD COLUMN IF NOT EXISTS customer_name TEXT;
