-- Sales staff could update or delete any profile.
--
-- "Admins have full access to profiles" and admin_all_profiles are ALL policies
-- on is_admin(), which admits sales_staff, so a sales staff session could change
-- any customer's or colleague's email, phone, name or address through the
-- public API, or delete the row. Role changes were already blocked by
-- prevent_role_escalation, and the staff fields by tr_profiles_protected_columns.
--
-- No browser code writes another person's profile: staff changes go through the
-- service role (team actions, set-wholesale, invites, settlement), and the
-- account pages only write the caller's own row, which user_own_profile and the
-- "own profile" policies still allow. Staff keep reading every profile through
-- "Enable read access for authenticated users" (is_admin() or own row), so the
-- ALL policies are narrowed to owner/admin without losing any read.
--
-- ALTER only. Undo = ALTER both back to is_admin().

alter policy "Admins have full access to profiles" on public.profiles
    using ((select public.fn_is_owner_or_admin()))
    with check ((select public.fn_is_owner_or_admin()));
alter policy admin_all_profiles on public.profiles
    using ((select public.fn_is_owner_or_admin()))
    with check ((select public.fn_is_owner_or_admin()));
