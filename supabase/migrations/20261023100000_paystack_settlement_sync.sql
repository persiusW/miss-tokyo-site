-- Paystack settlements saved locally so Dashttp's Command Centre can read the
-- commission Miss Tokyo earned from them without ever holding Miss Tokyo's
-- Paystack key. An hourly job writes these tables; Command reads them
-- read-only. All amounts are GH₵ (numeric(12,2)), not pesewas.
--
-- paystack_settlements: one row per Paystack settlement (id = Paystack's id).
-- is_admin marks settlements paid to an admin subaccount. txs_synced_at is
-- set once the settlement's transactions have been saved.
-- paystack_settlement_txs: the transactions inside a settlement, linked to
-- an order where the reference matches one.
-- billing_period_snapshot: the usage figures for a billing period, same
-- shape as billing_statements.internal.
-- RLS on with no policies: service role only.
create table if not exists public.paystack_settlements (
    id text primary key,
    subaccount_code text,
    is_admin boolean not null default false,
    status text not null,
    settled_at timestamptz,
    gross_ghs numeric(12,2),
    fees_ghs numeric(12,2),
    net_ghs numeric(12,2) not null,
    raw jsonb not null default '{}'::jsonb,
    synced_at timestamptz not null default now(),
    txs_synced_at timestamptz
);

create index if not exists paystack_settlements_admin_settled_idx
    on public.paystack_settlements (is_admin, settled_at desc);

create table if not exists public.paystack_settlement_txs (
    settlement_id text not null references public.paystack_settlements(id),
    reference text not null,
    order_id uuid references public.orders(id) on delete set null,
    source text not null check (source in ('checkout', 'pos', 'invoice', 'other')),
    amount_ghs numeric(12,2) not null,
    admin_share_ghs numeric(12,2),
    paystack_cut_ghs numeric(12,2),
    paid_at timestamptz,
    raw jsonb not null default '{}'::jsonb,
    primary key (settlement_id, reference)
);

create index if not exists paystack_settlement_txs_reference_idx
    on public.paystack_settlement_txs (reference);

create table if not exists public.billing_period_snapshot (
    period_start date primary key,
    period_end date not null,
    computed_at timestamptz not null default now(),
    internal jsonb not null,
    total_ghs numeric(12,2) not null,
    base_ghs numeric(12,2) not null
);

alter table public.paystack_settlements enable row level security;
alter table public.paystack_settlement_txs enable row level security;
alter table public.billing_period_snapshot enable row level security;
revoke all on public.paystack_settlements from anon, authenticated;
revoke all on public.paystack_settlement_txs from anon, authenticated;
revoke all on public.billing_period_snapshot from anon, authenticated;

-- Switch for the hourly sync (default on). fn_settings_save reads column
-- names from information_schema, so the new column saves without changes
-- to that function.
alter table public.store_settings
    add column if not exists paystack_sync_enabled boolean not null default true;
