-- Allow sales_staff to read activity logs (previously restricted to admin/owner only)
DROP POLICY IF EXISTS "Owners and Admins can view logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Admins can view activity logs" ON public.activity_logs;

CREATE POLICY "Staff can view activity logs" ON public.activity_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (select auth.uid())
            AND role IN ('admin', 'owner', 'sales_staff')
        )
    );
