-- ============================================================
-- ADMIN GOD MODE: Unrestricted CRUD for admin/owner roles
-- ============================================================
-- Creates is_admin() helper + permissive policies on all
-- tables the client-side admin dashboard mutates.
-- ============================================================

-- ── 1. Helper function ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'owner', 'sales_staff')
  );
$$;

-- ── 2. Core catalog tables ───────────────────────────────────

-- products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_products" ON public.products;
CREATE POLICY "admin_all_products"
  ON public.products FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "public_read_products" ON public.products;
CREATE POLICY "public_read_products"
  ON public.products FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_categories" ON public.categories;
CREATE POLICY "admin_all_categories"
  ON public.categories FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "public_read_categories" ON public.categories;
CREATE POLICY "public_read_categories"
  ON public.categories FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- coupons / discounts
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_coupons" ON public.coupons;
CREATE POLICY "admin_all_coupons"
  ON public.coupons FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- gift_cards
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_gift_cards" ON public.gift_cards;
CREATE POLICY "admin_all_gift_cards"
  ON public.gift_cards FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- ── 3. Operations tables ─────────────────────────────────────

-- riders
ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_riders" ON public.riders;
CREATE POLICY "admin_all_riders"
  ON public.riders FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_orders" ON public.orders;
CREATE POLICY "admin_all_orders"
  ON public.orders FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "customer_own_orders" ON public.orders;
CREATE POLICY "customer_own_orders"
  ON public.orders FOR SELECT TO authenticated
  USING (customer_email = (
    SELECT email FROM auth.users WHERE id = auth.uid()
  ));

-- ── 4. Customer & contact tables ─────────────────────────────

-- contacts (manual contact list in CRM)
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_contacts" ON public.contacts;
CREATE POLICY "admin_all_contacts"
  ON public.contacts FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- contact_submissions (from quote/contact forms)
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_contact_submissions" ON public.contact_submissions;
CREATE POLICY "admin_all_contact_submissions"
  ON public.contact_submissions FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "anon_insert_contact_submissions" ON public.contact_submissions;
CREATE POLICY "anon_insert_contact_submissions"
  ON public.contact_submissions FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- contact_inquiries (per-customer inquiry history)
ALTER TABLE public.contact_inquiries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_contact_inquiries" ON public.contact_inquiries;
CREATE POLICY "admin_all_contact_inquiries"
  ON public.contact_inquiries FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- profiles (admins see all; users manage own)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_profiles" ON public.profiles;
CREATE POLICY "admin_all_profiles"
  ON public.profiles FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "user_own_profile" ON public.profiles;
CREATE POLICY "user_own_profile"
  ON public.profiles FOR ALL TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- abandoned_history
ALTER TABLE public.abandoned_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_abandoned_history" ON public.abandoned_history;
CREATE POLICY "admin_all_abandoned_history"
  ON public.abandoned_history FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- addresses
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_addresses" ON public.addresses;
CREATE POLICY "admin_all_addresses"
  ON public.addresses FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "user_own_addresses" ON public.addresses;
CREATE POLICY "user_own_addresses"
  ON public.addresses FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── 5. Settings tables ───────────────────────────────────────

-- site_settings
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_site_settings" ON public.site_settings;
CREATE POLICY "admin_all_site_settings"
  ON public.site_settings FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "public_read_site_settings" ON public.site_settings;
CREATE POLICY "public_read_site_settings"
  ON public.site_settings FOR SELECT TO anon, authenticated
  USING (true);

-- store_settings
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_store_settings" ON public.store_settings;
CREATE POLICY "admin_all_store_settings"
  ON public.store_settings FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "public_read_store_settings" ON public.store_settings;
CREATE POLICY "public_read_store_settings"
  ON public.store_settings FOR SELECT TO anon, authenticated
  USING (true);

-- business_settings
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_business_settings" ON public.business_settings;
CREATE POLICY "admin_all_business_settings"
  ON public.business_settings FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "public_read_business_settings" ON public.business_settings;
CREATE POLICY "public_read_business_settings"
  ON public.business_settings FOR SELECT TO anon, authenticated
  USING (true);

-- hero_slides
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_hero_slides" ON public.hero_slides;
CREATE POLICY "admin_all_hero_slides"
  ON public.hero_slides FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "public_read_hero_slides" ON public.hero_slides;
CREATE POLICY "public_read_hero_slides"
  ON public.hero_slides FOR SELECT TO anon, authenticated
  USING (true);

-- homepage_reviews
ALTER TABLE public.homepage_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_homepage_reviews" ON public.homepage_reviews;
CREATE POLICY "admin_all_homepage_reviews"
  ON public.homepage_reviews FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "public_read_homepage_reviews" ON public.homepage_reviews;
CREATE POLICY "public_read_homepage_reviews"
  ON public.homepage_reviews FOR SELECT TO anon, authenticated
  USING (true);

-- communication_templates
ALTER TABLE public.communication_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_comm_templates" ON public.communication_templates;
CREATE POLICY "admin_all_comm_templates"
  ON public.communication_templates FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- site_copy (static text content)
ALTER TABLE public.site_copy ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_site_copy" ON public.site_copy;
CREATE POLICY "admin_all_site_copy"
  ON public.site_copy FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "public_read_site_copy" ON public.site_copy;
CREATE POLICY "public_read_site_copy"
  ON public.site_copy FOR SELECT TO anon, authenticated
  USING (true);

-- ── 6. Finance tables ────────────────────────────────────────

-- documents (invoices/quotes)
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_documents" ON public.documents;
CREATE POLICY "admin_all_documents"
  ON public.documents FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- pay_links
ALTER TABLE public.pay_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_pay_links" ON public.pay_links;
CREATE POLICY "admin_all_pay_links"
  ON public.pay_links FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
