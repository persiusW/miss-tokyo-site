-- Only an admin can see, make, change or remove an admin.
--
-- Owners had the same staff powers as admins: through the app and through the
-- public API with their own session they could promote anyone to admin, demote,
-- deactivate or remove the admin, create admin invites and read the admin's
-- activity. Admin is the developer's role, so it is now invisible to owners:
--
-- * fn_is_admin_role(): is the caller an admin (not owner, not sales staff).
-- * prevent_role_escalation: an owner can't give, change or take away the
--   admin role, including the role a deactivated admin is waiting to get back.
-- * profiles: the two owner/admin ALL policies and the staff read policy skip
--   admin rows unless the caller is an admin. Everyone still reads their own row
--   through the own-profile policies.
-- * team_invitations: owners can't read or write invites for the admin role.
-- * activity_logs: rows logged by an admin are read by admins only.
--
-- The app runs staff changes on the service role, so the server actions check
-- the same rule (components/admin/v2/staff/actions.ts, settings/actions.ts).
--
-- ALTER / same-signature replace only. Undo = the previous expressions, kept in
-- 20261022120300_profiles_staff_writes_owner_admin.sql, 20260804000000_fix_role_change_trigger.sql
-- and the live definitions noted beside each statement below.

create or replace function public.fn_is_admin_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.profiles
        where id = auth.uid()
          and role = 'admin'
    );
$$;

-- Policies with roles=public are evaluated for anon too, so anon needs EXECUTE
-- (see rls-policy-helper-anon-execute). It only answers about the caller.
revoke execute on function public.fn_is_admin_role() from public;
grant execute on function public.fn_is_admin_role() to anon, authenticated, service_role;

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  jwt_claims text;
  jwt_role text;
  caller_role text;
begin
  if new.role is not distinct from old.role then
    return new;
  end if;

  jwt_claims := nullif(current_setting('request.jwt.claims', true), '');

  -- No request JWT at all: a direct database connection (SQL editor,
  -- psql, migrations). Not reachable from the app, so allow it.
  if jwt_claims is null then
    return new;
  end if;

  jwt_role := jwt_claims::json ->> 'role';

  -- Service role key: trusted server-side path (staff actions, invites).
  if jwt_role = 'service_role' or current_setting('role', true) = 'service_role' then
    return new;
  end if;

  select p.role into caller_role from public.profiles p where p.id = auth.uid();

  if caller_role = 'admin' then
    return new;
  end if;

  if caller_role = 'owner' then
    if old.role = 'admin' or new.role = 'admin' or old.staff_deactivated_role = 'admin' then
      raise exception 'Only an admin may give, change or remove the admin role'
        using errcode = '42501';
    end if;
    return new;
  end if;

  raise exception 'Only admins and owners may change a profile role'
    using errcode = '42501';
end;
$fn$;

-- Live before: using/check = (select fn_is_owner_or_admin())
alter policy "Admins have full access to profiles" on public.profiles
    using ((select public.fn_is_owner_or_admin())
           and ((select public.fn_is_admin_role())
                or (role is distinct from 'admin' and staff_deactivated_role is distinct from 'admin')))
    with check ((select public.fn_is_owner_or_admin())
           and ((select public.fn_is_admin_role())
                or (role is distinct from 'admin' and staff_deactivated_role is distinct from 'admin')));
alter policy admin_all_profiles on public.profiles
    using ((select public.fn_is_owner_or_admin())
           and ((select public.fn_is_admin_role())
                or (role is distinct from 'admin' and staff_deactivated_role is distinct from 'admin')))
    with check ((select public.fn_is_owner_or_admin())
           and ((select public.fn_is_admin_role())
                or (role is distinct from 'admin' and staff_deactivated_role is distinct from 'admin')));

-- Live before: using = (select is_admin()) or (id = (select auth.uid()))
alter policy "Enable read access for authenticated users" on public.profiles
    using (((select public.is_admin())
            and ((select public.fn_is_admin_role())
                 or (role is distinct from 'admin' and staff_deactivated_role is distinct from 'admin')))
           or (id = (select auth.uid())));

-- Live before: using = exists(profiles where id = auth.uid() and role in ('admin','owner')), no check
alter policy "Owners and Admins can manage invitations" on public.team_invitations
    using ((select public.fn_is_owner_or_admin())
           and ((select public.fn_is_admin_role()) or role is distinct from 'admin'))
    with check ((select public.fn_is_owner_or_admin())
           and ((select public.fn_is_admin_role()) or role is distinct from 'admin'));

-- Live before: using = exists(profiles where id = auth.uid() and role in ('admin','owner'))
alter policy "Owners and Admins can view logs" on public.activity_logs
    using ((select public.fn_is_owner_or_admin())
           and ((select public.fn_is_admin_role()) or user_role is distinct from 'admin'));
