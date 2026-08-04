-- ============================================================
-- FIX: role changes were silently reverted, never blocked
-- ============================================================
-- prevent_role_escalation() (20260321000000_security_patches.sql) did
-- `NEW.role := OLD.role` whenever is_admin() was false. Two consequences:
--
--   1. Server-side role changes made with the service role key
--      (removeTeamMember, the invite-acceptance upsert) run with
--      auth.uid() = NULL, so is_admin() is false and the write was
--      reverted in-place. PostgREST still returned 200 with no error,
--      so the dashboard reported "Team member removed" while the row
--      never changed. Same for anything run from the SQL editor
--      (auth.uid() is NULL there too).
--
--   2. is_admin() is true for 'sales_staff', so a sales staff member
--      could escalate their own profile to 'owner' through the
--      user_own_profile UPDATE policy.
--
-- This replaces the function: privileged callers (service role key,
-- direct database connections, admin/owner sessions) are allowed
-- through; everyone else gets a hard error instead of a silent revert.
--
-- Note: current_user is NOT usable here — inside a SECURITY DEFINER
-- function it reports the function owner, not the caller. The request
-- JWT claims that PostgREST sets are the reliable signal.

CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  jwt_claims text;
  jwt_role text;
  caller_role text;
BEGIN
  IF NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;

  jwt_claims := nullif(current_setting('request.jwt.claims', true), '');

  -- No request JWT at all: a direct database connection (SQL editor,
  -- psql, migrations). Not reachable from the app, so allow it.
  IF jwt_claims IS NULL THEN
    RETURN NEW;
  END IF;

  jwt_role := jwt_claims::json ->> 'role';

  -- Service role key: trusted server-side path (removeTeamMember, invites).
  IF jwt_role = 'service_role' OR current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Authenticated caller: only admins and owners may change any role.
  -- Deliberately stricter than is_admin(), which also returns true for
  -- sales_staff and therefore permitted self-escalation.
  SELECT p.role INTO caller_role FROM public.profiles p WHERE p.id = auth.uid();

  IF caller_role IN ('admin', 'owner') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Only admins and owners may change a profile role'
    USING ERRCODE = '42501';
END;
$fn$;

DROP TRIGGER IF EXISTS tr_prevent_role_escalation ON public.profiles;
CREATE TRIGGER tr_prevent_role_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();
