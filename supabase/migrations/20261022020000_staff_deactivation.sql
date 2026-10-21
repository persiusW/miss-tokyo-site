-- Admin v2 › Staff: deactivate and reactivate a staff member, change roles,
-- and sign someone out everywhere — with the "last owner" rule enforced in the
-- database, not only in the page.
--
-- Deactivating moves the person's role to 'customer' (the same lock-out the old
-- "Remove member" relies on) and remembers the role they had, so every existing
-- gate — the dashboard layout, requireStaff, each route's role list, RLS — locks
-- them out without anything new to check. Reactivating puts the role back.
-- The app also bans the auth user through the auth admin API so they can't
-- sign in at all while deactivated.
--
-- Additive only: three nullable columns, a CHECK on the new column, and new
-- functions callable by the service role only.

alter table public.profiles
    add column if not exists staff_deactivated_at timestamptz,
    add column if not exists staff_deactivated_role text,
    add column if not exists staff_deactivated_by uuid;

alter table public.profiles
    add constraint profiles_staff_deactivated_role_check
    check (staff_deactivated_role is null or staff_deactivated_role = any (array['owner', 'admin', 'sales_staff']));

-- The Staff page logs its own actions with the existing UPDATE / DELETE labels
-- on resource 'staff' or 'invite' (details.action says which), so the
-- activity_logs CHECK constraint doesn't need replacing.

-- Every staff change takes the same transaction-scoped lock, so two people
-- demoting the last two owners at the same moment can't both succeed.
create or replace function public.fn_staff_guard_owner(p_target uuid, p_next_role text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_role text;
    v_owners int;
begin
    perform pg_advisory_xact_lock(hashtext('fn_staff_owner_guard'));
    select role into v_role from public.profiles where id = p_target;
    if v_role is null then
        raise exception 'not_found';
    end if;
    if v_role = 'owner' and p_next_role is distinct from 'owner' then
        select count(*) into v_owners from public.profiles where role = 'owner';
        if v_owners <= 1 then
            raise exception 'last_owner';
        end if;
    end if;
end;
$$;

-- Change a current staff member's role. Returns the role they had.
create or replace function public.fn_staff_set_role(p_target uuid, p_role text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_prev text;
begin
    if p_role is null or p_role <> all (array['owner', 'admin', 'sales_staff']) then
        raise exception 'bad_role';
    end if;
    perform public.fn_staff_guard_owner(p_target, p_role);
    select role into v_prev from public.profiles where id = p_target for update;
    if v_prev is null or v_prev <> all (array['owner', 'admin', 'sales_staff']) then
        raise exception 'not_staff';
    end if;
    update public.profiles set role = p_role where id = p_target;
    return v_prev;
end;
$$;

-- Deactivate: remember the role, lock them out, end every session.
create or replace function public.fn_staff_deactivate(p_target uuid, p_actor uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_prev text;
begin
    if p_target = p_actor then
        raise exception 'self';
    end if;
    perform public.fn_staff_guard_owner(p_target, 'customer');
    select role into v_prev from public.profiles where id = p_target for update;
    if v_prev is null or v_prev <> all (array['owner', 'admin', 'sales_staff']) then
        raise exception 'not_staff';
    end if;
    update public.profiles
       set role = 'customer',
           staff_deactivated_role = v_prev,
           staff_deactivated_at = now(),
           staff_deactivated_by = p_actor
     where id = p_target;
    delete from auth.refresh_tokens where user_id = p_target::text;
    delete from auth.sessions where user_id = p_target;
    return v_prev;
end;
$$;

-- Reactivate: give back the role they had when they were deactivated.
create or replace function public.fn_staff_reactivate(p_target uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_role text;
begin
    perform pg_advisory_xact_lock(hashtext('fn_staff_owner_guard'));
    select staff_deactivated_role into v_role from public.profiles
     where id = p_target and staff_deactivated_at is not null
       for update;
    if v_role is null then
        raise exception 'not_deactivated';
    end if;
    update public.profiles
       set role = v_role,
           staff_deactivated_role = null,
           staff_deactivated_at = null,
           staff_deactivated_by = null
     where id = p_target;
    return v_role;
end;
$$;

-- Remove from staff (the old "Remove member"): back to a plain customer
-- account, kept able to sign in and shop. Returns the role they had.
create or replace function public.fn_staff_remove(p_target uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_prev text;
    v_was_deactivated boolean;
begin
    perform public.fn_staff_guard_owner(p_target, 'customer');
    select role, staff_deactivated_at is not null into v_prev, v_was_deactivated
      from public.profiles where id = p_target for update;
    if v_prev is null or (v_prev <> all (array['owner', 'admin', 'sales_staff']) and not v_was_deactivated) then
        raise exception 'not_staff';
    end if;
    update public.profiles
       set role = 'customer',
           staff_deactivated_role = null,
           staff_deactivated_at = null,
           staff_deactivated_by = null
     where id = p_target;
    return v_prev;
end;
$$;

-- End every session the person has. GoTrue has no admin endpoint for this on
-- this project's version, so the rows go here; getUser() then refuses their
-- old access token and the refresh token is gone.
create or replace function public.fn_staff_sign_out_everywhere(p_target uuid)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_n int;
begin
    if not exists (select 1 from public.profiles where id = p_target) then
        raise exception 'not_found';
    end if;
    delete from auth.refresh_tokens where user_id = p_target::text;
    delete from auth.sessions where user_id = p_target;
    get diagnostics v_n = row_count;
    return v_n;
end;
$$;

revoke execute on function public.fn_staff_guard_owner(uuid, text) from public, anon, authenticated;
revoke execute on function public.fn_staff_set_role(uuid, text) from public, anon, authenticated;
revoke execute on function public.fn_staff_deactivate(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.fn_staff_reactivate(uuid) from public, anon, authenticated;
revoke execute on function public.fn_staff_remove(uuid) from public, anon, authenticated;
revoke execute on function public.fn_staff_sign_out_everywhere(uuid) from public, anon, authenticated;

grant execute on function public.fn_staff_set_role(uuid, text) to service_role;
grant execute on function public.fn_staff_deactivate(uuid, uuid) to service_role;
grant execute on function public.fn_staff_reactivate(uuid) to service_role;
grant execute on function public.fn_staff_remove(uuid) to service_role;
grant execute on function public.fn_staff_sign_out_everywhere(uuid) to service_role;
