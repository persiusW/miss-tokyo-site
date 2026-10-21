-- One row per paid online payment carrying a processing fee: the admin share
-- it earned, what actually reached the admin payout account (read from
-- Paystack's own split figures), and why nothing did when it didn't. Manual
-- rows record a payment made to the admin outside Paystack.
--
-- Owed = sum(share_due_ghs) - sum(taken_ghs). Later payments carry what is
-- owed (Admin Tools › Payouts), so the admin is always paid in the end.
-- Refunds never reduce a row: the share was earned when the payment landed.
-- Written by the server (webhook, verify, reconcile) only: idempotent per
-- Paystack reference. RLS on with no policies: service role only.
create table if not exists public.admin_payout_ledger (
    id uuid primary key default gen_random_uuid(),
    reference text not null unique check (char_length(reference) between 1 and 200),
    kind text not null default 'charge' check (kind in ('charge', 'manual')),
    source text check (source in ('checkout', 'pos', 'invoice', 'other')),
    order_id uuid references public.orders(id) on delete set null,
    pos_session_id uuid,
    invoice_id text,
    paid_at timestamptz not null default now(),
    amount_ghs numeric(12,2) not null default 0,
    charged_ghs numeric(12,2),
    fee_ghs numeric(12,2) not null default 0,
    fee_base_ghs numeric(12,2),
    share_due_ghs numeric(12,2) not null default 0 check (share_due_ghs >= 0),
    taken_ghs numeric(12,2) not null default 0 check (taken_ghs >= 0),
    outcome text not null check (outcome in ('paid_by_split', 'owed', 'no_share', 'manual_payment')),
    skip_reason text check (skip_reason is null or skip_reason in ('switch_off', 'no_account', 'small', 'split_failed')),
    subaccount_code text,
    rule jsonb not null default '{}'::jsonb,
    note text check (note is null or char_length(note) <= 300),
    created_by uuid,
    created_at timestamptz not null default now()
);

create index if not exists admin_payout_ledger_paid_at_idx on public.admin_payout_ledger (paid_at desc);
create index if not exists admin_payout_ledger_order_idx on public.admin_payout_ledger (order_id) where order_id is not null;

alter table public.admin_payout_ledger enable row level security;
revoke all on public.admin_payout_ledger from anon, authenticated;

-- The running position in one round trip (checkout calls it when the
-- automatic share is on). SECURITY INVOKER: it reads as the caller, and only
-- the service role can read the table anyway.
create or replace function public.fn_admin_payout_totals()
returns table (due_ghs numeric, taken_ghs numeric, owed_ghs numeric, paid_month_ghs numeric, rows_count bigint)
language sql stable security invoker set search_path = public
as $$
    select coalesce(sum(l.share_due_ghs), 0),
           coalesce(sum(l.taken_ghs), 0),
           coalesce(sum(l.share_due_ghs), 0) - coalesce(sum(l.taken_ghs), 0),
           coalesce(sum(l.taken_ghs) filter (where l.paid_at >= date_trunc('month', now() at time zone 'UTC') at time zone 'UTC'), 0),
           count(*)
    from public.admin_payout_ledger l
$$;

revoke execute on function public.fn_admin_payout_totals() from public, anon, authenticated;
grant execute on function public.fn_admin_payout_totals() to service_role;
