-- Staff-only tables were readable by every signed-in customer.
--
-- These policies said `to authenticated using (true)`, so any shop customer
-- with a session could read every row through the public anon key: every
-- customer's email and phone (profiles), POS sale customers (pos_sessions),
-- the stock ledger, reservations, discount holds, push endpoints and the
-- message templates. communication_templates also let any customer insert,
-- edit and delete the templates the shop sends.
--
-- Staff (admin, owner, sales_staff) pass is_admin(), so the dashboard keeps
-- working. Every app read of these tables outside the dashboard goes through
-- supabaseAdmin (service role), which RLS does not apply to. Customers keep
-- their own profile row.
--
-- ALTER only: no policy is dropped, so rolling back is ALTER ... USING (true).

alter policy "Enable read access for authenticated users" on public.profiles
    using ((select public.is_admin()) or id = (select auth.uid()));

alter policy "Authenticated users can read communication templates" on public.communication_templates
    using ((select public.is_admin()));
alter policy "Authenticated users can insert communication templates" on public.communication_templates
    with check ((select public.is_admin()));
alter policy "Authenticated users can update communication templates" on public.communication_templates
    using ((select public.is_admin()))
    with check ((select public.is_admin()));
alter policy "Authenticated users can delete communication templates" on public.communication_templates
    using ((select public.is_admin()));

alter policy "Restrict read to authenticated staff" on public.customer_push_subscriptions
    using ((select public.is_admin()));
-- Subscriptions are written by /api/push/subscribe on the service role. The
-- delete policy's `email = email` was true for every row, so anyone with the
-- anon key could delete every customer's subscription, and anyone could insert
-- one under any email and receive that customer's order notifications.
alter policy "Allow public/authenticated inserts for subscriptions" on public.customer_push_subscriptions
    with check (user_id = (select auth.uid()));
alter policy "Allow users to delete their own device subscriptions" on public.customer_push_subscriptions
    using (user_id = (select auth.uid()));

alter policy staff_select_discount_holds on public.discount_holds
    using ((select public.is_admin()));
alter policy staff_select_online_reservations on public.online_reservations
    using ((select public.is_admin()));
alter policy staff_select_pos_reservations on public.pos_reservations
    using ((select public.is_admin()));
alter policy staff_select_pos_sessions on public.pos_sessions
    using ((select public.is_admin()));
alter policy staff_select_stock_movements on public.stock_movements
    using ((select public.is_admin()));

-- Every active coupon code was listable by anyone with the anon key. Codes are
-- checked on the server (lib/discountValidation, service role); only the staff
-- Discounts page reads the table from a browser, and staff also pass
-- admin_all_coupons.
alter policy "Public can view active coupons" on public.coupons
    using ((select public.is_admin()));
