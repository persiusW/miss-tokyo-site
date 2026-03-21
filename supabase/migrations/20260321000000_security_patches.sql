-- ============================================================
-- SECURITY PATCHES: RLS HARDENING & DATA INTEGRITY
-- ============================================================

-- ── 1. Fix Profiles RLS Role Escalation Vulnerability ───────

-- Remove the overly permissive UPDATE policy
DROP POLICY IF EXISTS "user_own_profile" ON public.profiles;

-- Add a restricted policy that only allows updating safe columns
-- Note: PostgreSQL RLS doesn't natively support column-level 'WITH CHECK' as easily as row-level.
-- We will use a trigger to prevent unauthorized role changes.

CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- If the role is being changed and the caller is not an admin/owner
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN
    -- Fallback: If it's the user themselves, revert to old role
    NEW.role := OLD.role;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_prevent_role_escalation ON public.profiles;
CREATE TRIGGER tr_prevent_role_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

-- Re-enable own profile updates (safe now with trigger)
CREATE POLICY "user_own_profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ── 2. Data Integrity: Foreign Keys & Cascading ──────────────

-- Profiles: Link to auth.users (id) if missing
-- Note: profiles.id is already the primary key and usually maps to auth.users.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Orders: Ensure user_id references auth.users with proper deletion handling
-- We keep orders if a user is deleted, but we set user_id to NULL.
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE public.orders
ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Back in stock requests
ALTER TABLE public.back_in_stock_requests DROP CONSTRAINT IF EXISTS back_in_stock_requests_product_id_fkey;
ALTER TABLE public.back_in_stock_requests
ADD CONSTRAINT back_in_stock_requests_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

-- ── 3. Addresses ─────────────────────────────────────────────
ALTER TABLE public.addresses DROP CONSTRAINT IF EXISTS addresses_user_id_fkey;
ALTER TABLE public.addresses
ADD CONSTRAINT addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
