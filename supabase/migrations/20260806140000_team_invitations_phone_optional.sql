-- Fix: inviting a team member without a phone number failed with
--   23502: null value in column "phone" of relation "team_invitations"
--
-- The invite modal labels the field "Phone number (optional)" and
-- inviteTeamMember() sends `phone: data.phone || null`, but the live column
-- had drifted to NOT NULL (the original migration, 20260321150514, declared it
-- nullable). Restore the intended nullability.

ALTER TABLE public.team_invitations
    ALTER COLUMN phone DROP NOT NULL;
