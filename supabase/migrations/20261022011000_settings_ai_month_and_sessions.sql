-- Admin v2 Settings, two read-only helpers. Additive only.
--
-- 1. AI use in a time range (gap 19): Settings › Assistants shows this month's
--    AI use next to the daily cap. Summed in SQL because PostgREST stops an
--    unpaged select at 1000 rows and a month of turns is more than that.
create or replace function public.fn_ai_cost_between(p_from timestamptz, p_to timestamptz)
returns table (turns bigint, cost_usd numeric)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
    select count(*)::bigint, coalesce(sum(t.cost_usd), 0)::numeric
      from public.ai_turns t
     where t.created_at >= p_from and t.created_at < p_to;
$$;

revoke execute on function public.fn_ai_cost_between(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.fn_ai_cost_between(timestamptz, timestamptz) to service_role;

-- 2. Where a staff member is signed in (gap 24): Settings › Your account lists
--    the signed-in user's own sessions. auth.sessions is not reachable through
--    the API, so this reads it as the owner. The server action passes the
--    caller's own user id, taken from their verified session, never from input.
create or replace function public.fn_my_auth_sessions(p_user uuid)
returns table (id uuid, created_at timestamptz, last_active_at timestamptz, user_agent text, aal text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select s.id, s.created_at,
           greatest(coalesce(s.refreshed_at at time zone 'UTC', s.created_at), coalesce(s.updated_at, s.created_at)),
           s.user_agent, s.aal::text
      from auth.sessions s
     where s.user_id = p_user
       and (s.not_after is null or s.not_after > now())
     order by 3 desc
     limit 20;
$$;

revoke execute on function public.fn_my_auth_sessions(uuid) from public, anon, authenticated;
grant execute on function public.fn_my_auth_sessions(uuid) to service_role;
