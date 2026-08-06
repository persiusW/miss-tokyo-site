-- Fix: revoking a pending invitation always failed.
--
-- TeamTab's handleRevoke writes status = 'revoked', but the live check
-- constraint only allowed ('pending', 'accepted', 'expired'). Widen it to
-- accept 'revoked' as well, keeping 'expired' (used by the live data set).

ALTER TABLE public.team_invitations
    DROP CONSTRAINT IF EXISTS team_invitations_status_check;

ALTER TABLE public.team_invitations
    ADD CONSTRAINT team_invitations_status_check
    CHECK (status IN ('pending', 'accepted', 'expired', 'revoked'));
