-- The features bill and the Dashttp connection.
--   billing_statements   one frozen statement per period (snapshot of usage,
--                        prices and markup → total), submitted to Dashttp.
--   billing_other_lines  "Other" metered lines the admin adds.
--   dashttp_events       webhook events from Dashttp, idempotent by event id.
--   dashttp_state        the last Dashttp billing reply, so Billing loads fast
--                        and still shows something when Dashttp is slow.
--   cron_runs            when scheduled jobs last ran (Admin Tools › System).
-- All RLS on with no policies: service role only.
create table if not exists public.billing_statements (
    id uuid primary key default gen_random_uuid(),
    period_start date not null unique,
    period_end date not null check (period_end >= period_start),
    status text not null default 'frozen' check (status in ('frozen', 'submitted', 'submit_failed', 'paid', 'void')),
    -- Client-facing lines only: [{service, description, quantity, unit, amountGhs}]
    lines jsonb not null default '[]'::jsonb,
    -- Admin only: usage, rates, markup and cost at freeze time.
    internal jsonb not null default '{}'::jsonb,
    total_ghs numeric(12,2) not null default 0 check (total_ghs >= 0),
    idempotency_key text not null unique,
    frozen_at timestamptz not null default now(),
    frozen_by text not null default 'cron',
    dashttp_invoice_id text,
    dashttp_invoice_number text,
    dashttp_status text,
    pay_url text,
    pdf_url text,
    submitted_at timestamptz,
    submit_attempts integer not null default 0,
    last_error text check (last_error is null or char_length(last_error) <= 300),
    paid_at timestamptz,
    updated_at timestamptz not null default now()
);

create table if not exists public.billing_other_lines (
    id uuid primary key default gen_random_uuid(),
    description text not null check (char_length(description) between 1 and 120),
    quantity numeric(12,3) not null default 1 check (quantity >= 0),
    unit text not null default 'item' check (char_length(unit) between 1 and 30),
    unit_price_ghs numeric(12,2) not null check (unit_price_ghs >= 0),
    -- Recurring lines appear on every period; one-off lines on period_start's period only.
    recurring boolean not null default false,
    period_start date,
    active boolean not null default true,
    created_by uuid,
    created_at timestamptz not null default now(),
    check (recurring or period_start is not null)
);

create table if not exists public.dashttp_events (
    event_id text primary key check (char_length(event_id) between 1 and 200),
    type text not null,
    created_at timestamptz,
    received_at timestamptz not null default now(),
    data jsonb not null default '{}'::jsonb
);

create table if not exists public.dashttp_state (
    id text primary key default 'default' check (id = 'default'),
    billing jsonb,
    billing_at timestamptz,
    receipts jsonb,
    receipts_at timestamptz,
    last_event_at timestamptz,
    updated_at timestamptz not null default now()
);

create table if not exists public.cron_runs (
    id bigint generated always as identity primary key,
    job text not null check (char_length(job) <= 80),
    started_at timestamptz not null default now(),
    finished_at timestamptz,
    ok boolean,
    note text check (note is null or char_length(note) <= 300)
);
create index if not exists cron_runs_job_started_idx on public.cron_runs (job, started_at desc);

alter table public.billing_statements enable row level security;
alter table public.billing_other_lines enable row level security;
alter table public.dashttp_events enable row level security;
alter table public.dashttp_state enable row level security;
alter table public.cron_runs enable row level security;
revoke all on public.billing_statements, public.billing_other_lines, public.dashttp_events, public.dashttp_state, public.cron_runs from anon, authenticated;
