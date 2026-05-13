-- Consolidate activity_logs SELECT policy: admin and owner only (drop any duplicate policies)
DROP POLICY IF EXISTS "Staff can view activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Owners and Admins can view logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Admins can view activity logs" ON public.activity_logs;

CREATE POLICY "Owners and Admins can view logs" ON public.activity_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (select auth.uid())
            AND role IN ('admin', 'owner')
        )
    );
