-- Fix RLS InitPlan performance warnings
-- Replaces auth.uid() with (select auth.uid()) in all flagged policies so
-- the auth function is evaluated ONCE per query rather than once per row.
-- Affects 12 policies across 7 tables as identified by Supabase linter.

-- ── profiles ──────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles
    FOR SELECT USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
    FOR UPDATE USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles
    FOR INSERT WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "user_own_profile" ON public.profiles;
CREATE POLICY "user_own_profile" ON public.profiles
    FOR ALL USING ((select auth.uid()) = id);

-- ── orders ────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders" ON public.orders
    FOR SELECT USING ((select auth.uid()) IN (
        SELECT id FROM public.profiles WHERE email = customer_email
    ));

DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
CREATE POLICY "Users view own orders" ON public.orders
    FOR SELECT USING ((select auth.uid()) IN (
        SELECT id FROM public.profiles WHERE email = customer_email
    ));

DROP POLICY IF EXISTS "customer_own_orders" ON public.orders;
CREATE POLICY "customer_own_orders" ON public.orders
    FOR SELECT USING ((select auth.uid()) IN (
        SELECT id FROM public.profiles WHERE email = customer_email
    ));

-- ── addresses ─────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users manage own addresses" ON public.addresses;
CREATE POLICY "Users manage own addresses" ON public.addresses
    FOR ALL USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_own_addresses" ON public.addresses;
CREATE POLICY "user_own_addresses" ON public.addresses
    FOR ALL USING ((select auth.uid()) = user_id);

-- ── admin_push_subscriptions ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can manage their own push subscriptions" ON public.admin_push_subscriptions;
CREATE POLICY "Users can manage their own push subscriptions" ON public.admin_push_subscriptions
    FOR ALL USING ((select auth.uid()) = user_id);

-- ── gift_card_redemptions ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS "admin_full_access_redemptions" ON public.gift_card_redemptions;
CREATE POLICY "admin_full_access_redemptions" ON public.gift_card_redemptions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (select auth.uid())
            AND role IN ('admin', 'owner')
        )
    );

-- ── team_invitations ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Owners and Admins can manage invitations" ON public.team_invitations;
CREATE POLICY "Owners and Admins can manage invitations" ON public.team_invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (select auth.uid())
            AND role IN ('admin', 'owner')
        )
    );

-- ── activity_logs ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Owners and Admins can view logs" ON public.activity_logs;
CREATE POLICY "Owners and Admins can view logs" ON public.activity_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (select auth.uid())
            AND role IN ('admin', 'owner')
        )
    );
