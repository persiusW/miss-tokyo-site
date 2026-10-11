-- Miss Tokyo security fix, 2026-10-09. Safe to re-run.
-- Staff (owner / admin / sales_staff) keep full access through the existing
-- is_admin() policies. The app's server code uses the secret key and is not
-- affected by any of this.

-- 1. orders: remove "anyone can read/edit/delete/insert/mark paid".
drop policy if exists "Admins full access to orders" on public.orders;
drop policy if exists "Admins have full access to orders" on public.orders;
drop policy if exists "Allow update own pending order to paid" on public.orders;
drop policy if exists "Allow public inserts for orders" on public.orders;
drop policy if exists customer_own_orders_by_id on public.orders;
create policy customer_own_orders_by_id on public.orders
  for select to authenticated
  using (customer_id = auth.uid());

-- 2. Homepage / site content: public can read, only staff can write.
drop policy if exists public_all_site_settings on public.site_settings;
drop policy if exists public_all_hero_slides on public.hero_slides;
drop policy if exists public_all_homepage_reviews on public.homepage_reviews;

drop policy if exists public_all_featured_categories on public.featured_categories;
drop policy if exists public_read_featured_categories on public.featured_categories;
create policy public_read_featured_categories on public.featured_categories
  for select to anon, authenticated
  using (true);
drop policy if exists admin_all_featured_categories on public.featured_categories;
create policy admin_all_featured_categories on public.featured_categories
  for all to authenticated
  using (is_admin()) with check (is_admin());

-- 3. Newsletter list: no more public read/delete.
drop policy if exists public_all_newsletter_subscribers on public.newsletter_subscribers;
drop policy if exists admin_all_newsletter_subscribers on public.newsletter_subscribers;
create policy admin_all_newsletter_subscribers on public.newsletter_subscribers
  for all to authenticated
  using (is_admin()) with check (is_admin());

-- 4. "Any logged-in user" rules -> staff only.
drop policy if exists "Admin Contacts Access" on public.contacts;
drop policy if exists "Authenticated users full access on documents" on public.documents;
drop policy if exists "Admin Settings Access" on public.store_settings;
drop policy if exists contact_submissions_auth_all on public.contact_submissions;

drop policy if exists "Authenticated users can read and update push settings" on public.push_notification_settings;
drop policy if exists admin_all_push_notification_settings on public.push_notification_settings;
create policy admin_all_push_notification_settings on public.push_notification_settings
  for all to authenticated
  using (is_admin()) with check (is_admin());

drop policy if exists "Authenticated full access on riders" on public.riders;
drop policy if exists customer_read_assigned_riders on public.riders;
create policy customer_read_assigned_riders on public.riders
  for select to authenticated
  using (id in (select o.assigned_rider_id from public.orders o));

-- 5. Stock / discount functions: only the server may call them.
revoke execute on function public.fn_claim_coupon_use(uuid) from public, anon, authenticated;
revoke execute on function public.fn_redeem_gift_card(uuid, numeric) from public, anon, authenticated;
revoke execute on function public.fn_sync_order_stock_position(uuid, jsonb, boolean, text) from public, anon, authenticated;
revoke execute on function public.fn_sync_product_stock_from_variants(uuid) from public, anon, authenticated;
revoke execute on function public.get_order_stats() from public, anon, authenticated;
grant execute on function public.fn_claim_coupon_use(uuid) to service_role;
grant execute on function public.fn_redeem_gift_card(uuid, numeric) to service_role;
grant execute on function public.fn_sync_order_stock_position(uuid, jsonb, boolean, text) to service_role;
grant execute on function public.fn_sync_product_stock_from_variants(uuid) to service_role;
grant execute on function public.get_order_stats() to service_role;
