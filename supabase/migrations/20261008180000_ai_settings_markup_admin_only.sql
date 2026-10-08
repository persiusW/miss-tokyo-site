-- The dev cost markup is for the admin role only. Owners keep every other AI
-- setting; the markup row becomes invisible and unwritable to them. ALTER, not
-- drop-and-recreate: same policy, narrower condition (it covers ALL commands,
-- so reads and writes both follow it).
ALTER POLICY "admin_owner_only" ON public.ai_settings
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin'
           OR (profiles.role = 'owner' AND ai_settings.key <> 'admin_cost_markup_pct'))
  ));
