-- 1. team_invitations table
create table team_invitations (
    id uuid default gen_random_uuid() primary key,
    full_name text not null,
    email text not null,
    phone text,
    role text not null check (role in ('admin', 'owner', 'sales_staff', 'rider', 'support', 'content_editor')),
    token text not null unique,
    status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
    invited_by uuid references auth.users(id),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table team_invitations enable row level security;
create policy "Admins can manage team invitations" 
    on team_invitations for all 
    to authenticated 
    using (auth.uid() in (select id from public.profiles where role = 'admin' or role = 'owner'));

-- 2. activity_logs table for CRUD logger
create table activity_logs (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete set null,
    user_role text not null,
    action_type text not null,
    resource text not null,
    resource_id text,
    details jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table activity_logs enable row level security;
create policy "Admins can view activity logs"
    on activity_logs for select
    to authenticated
    using (auth.uid() in (select id from public.profiles where role = 'admin' or role = 'owner'));

create policy "Authenticated users can insert activity logs"
    on activity_logs for insert
    to authenticated
    with check (true);

-- 3. Add packed_by to orders
alter table public.orders 
add column packed_by uuid references public.profiles(id) on delete set null;

-- Need to manually grant access so functions can query
grant all on table public.team_invitations to postgres, anon, authenticated, service_role;
grant all on table public.activity_logs to postgres, anon, authenticated, service_role;
