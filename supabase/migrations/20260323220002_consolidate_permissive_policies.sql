-- Consolidate multiple permissive SELECT policies on high-traffic tables.
-- categories is queried on every page load. Having 4-5 overlapping SELECT policies
-- means Postgres evaluates all of them for every query — O(n policies) per row.
-- We keep one canonical policy per role/action combination.

-- ── categories ────────────────────────────────────────────────────────────────
-- Drop the redundant duplicates; keep admin_all_categories for authenticated admins
-- and consolidate anon/public access into a single policy.

DROP POLICY IF EXISTS "Allow public read access to active categories" ON public.categories;
DROP POLICY IF EXISTS "Allow public read access to categories" ON public.categories;

-- Ensure a single canonical public read policy exists
DROP POLICY IF EXISTS "public_read_categories" ON public.categories;
CREATE POLICY "public_read_categories" ON public.categories
    FOR SELECT
    USING (is_active = true);

-- ── business_settings ─────────────────────────────────────────────────────────
-- Drop the redundant duplicates; keep admin policy for mutations.

DROP POLICY IF EXISTS "Allow public read access to business settings" ON public.business_settings;

-- Ensure a single canonical public read policy exists
DROP POLICY IF EXISTS "public_read_business_settings" ON public.business_settings;
CREATE POLICY "public_read_business_settings" ON public.business_settings
    FOR SELECT
    USING (true);
