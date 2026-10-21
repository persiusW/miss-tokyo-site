-- Profile columns a customer must not write, and a profile a customer must not
-- re-create with a staff role.
--
-- 1. user_own_profile (ALL, own row) lets a signed-in customer update any column
--    of their own profile. prevent_role_escalation guards `role` on UPDATE only,
--    so a customer could still write staff_deactivated_role = 'owner' plus
--    staff_deactivated_at and appear in Team as a deactivated owner; one tap on
--    Reactivate (fn_staff_reactivate) would then make them an owner.
-- 2. The same policy allows DELETE of the own row, and the insert policies only
--    check `id = auth.uid()`. Nothing guarded `role` on INSERT, so a customer
--    could delete their profile and insert it again with role = 'owner'.
--    Proven in a rolled-back transaction: is_admin() returned true afterwards.
--
-- This trigger sits beside prevent_role_escalation and uses the same rule for
-- who is trusted: no JWT claims (direct database work, the auth service's
-- handle_new_user, cron) or the service role (supabaseAdmin, and therefore the
-- fn_staff_* functions, which are service_role only). Everyone else:
--   * may not set or change staff_deactivated_at / _role / _by or
--     acquisition_source (nothing outside the service role writes them), and
--   * may only insert a profile with role 'customer', unless the caller is an
--     owner or admin (the same exception prevent_role_escalation makes).
-- Customer own-profile inserts and upserts (account pages) carry the default
-- role 'customer' and none of these columns, so they keep working.

create function public.fn_profiles_protected_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    jwt_claims text;
    caller_role text;
begin
    jwt_claims := nullif(current_setting('request.jwt.claims', true), '');
    if jwt_claims is null then
        return new;
    end if;
    if jwt_claims::json ->> 'role' = 'service_role' or current_setting('role', true) = 'service_role' then
        return new;
    end if;

    if tg_op = 'INSERT' then
        if new.staff_deactivated_at is not null
           or new.staff_deactivated_role is not null
           or new.staff_deactivated_by is not null
           or new.acquisition_source is not null then
            raise exception 'These profile fields are managed by the shop'
                using errcode = '42501';
        end if;
        if new.role is distinct from 'customer' then
            select p.role into caller_role from public.profiles p where p.id = auth.uid();
            if caller_role is null or caller_role not in ('admin', 'owner') then
                raise exception 'Only admins and owners may set a profile role'
                    using errcode = '42501';
            end if;
        end if;
    else
        if new.staff_deactivated_at is distinct from old.staff_deactivated_at
           or new.staff_deactivated_role is distinct from old.staff_deactivated_role
           or new.staff_deactivated_by is distinct from old.staff_deactivated_by
           or new.acquisition_source is distinct from old.acquisition_source then
            raise exception 'These profile fields are managed by the shop'
                using errcode = '42501';
        end if;
    end if;
    return new;
end;
$$;

-- Trigger functions are never called directly; nobody needs EXECUTE.
revoke execute on function public.fn_profiles_protected_columns() from public, anon, authenticated;

create trigger tr_profiles_protected_columns
    before insert or update on public.profiles
    for each row execute function public.fn_profiles_protected_columns();
