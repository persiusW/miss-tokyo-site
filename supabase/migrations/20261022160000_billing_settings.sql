-- Billing and payout settings that only the admin role may change (Admin
-- Tools), plus the owner's monthly cap. One row, id 'default'.
--
-- RLS on with NO policies: only the service role (server code that has
-- checked the caller's role) reads or writes it. store_settings is publicly
-- readable and owner-writable, so none of this can live there.
--
-- Defaults are what happens today (read from live Paystack, 2026-10-21): the
-- site's split sends 2.5% of the order total to the admin subaccount, and
-- customers pay Paystack's fee on top. payout_split_live stays OFF, so
-- nothing about payments changes until the admin switches it on.
create table if not exists public.billing_settings (
    id text primary key default 'default' check (id = 'default'),
    -- Payouts
    payout_split_live boolean not null default false,
    admin_share_mode text not null default 'pct_of_order_total'
        check (admin_share_mode in ('pct_of_order_total', 'fee_minus_paystack', 'full_fee', 'custom_pct')),
    admin_share_pct numeric(6,3) not null default 2.5 check (admin_share_pct >= 0 and admin_share_pct <= 20),
    paystack_fee_pct numeric(6,3) not null default 1.95 check (paystack_fee_pct >= 0 and paystack_fee_pct <= 20),
    payout_min_ghs numeric(10,2) not null default 5 check (payout_min_ghs >= 0 and payout_min_ghs <= 1000),
    admin_subaccount_code text check (admin_subaccount_code is null or admin_subaccount_code ~ '^ACCT_[A-Za-z0-9]+$'),
    admin_subaccount_label text check (admin_subaccount_label is null or char_length(admin_subaccount_label) <= 160),
    admin_subaccount_set_at timestamptz,
    admin_subaccount_set_by uuid,
    -- Metered billing: admin unit prices (null = not priced yet, left off the bill)
    usd_to_ghs numeric(10,4) not null default 15.5 check (usd_to_ghs > 0 and usd_to_ghs <= 1000),
    ai_rate_unit text not null default 'cost' check (ai_rate_unit in ('cost', 'reply')),
    ai_rate_ghs numeric(12,4) check (ai_rate_ghs is null or ai_rate_ghs >= 0),
    sms_rate_ghs numeric(12,4) check (sms_rate_ghs is null or sms_rate_ghs >= 0),
    wa_message_rate_ghs numeric(12,4) check (wa_message_rate_ghs is null or wa_message_rate_ghs >= 0),
    wa_template_rate_ghs numeric(12,4) check (wa_template_rate_ghs is null or wa_template_rate_ghs >= 0),
    markup_pct numeric(6,2) not null default 0 check (markup_pct >= 0 and markup_pct <= 500),
    cutoff_day integer not null default 28 check (cutoff_day between 1 and 28),
    billing_start date not null default '2026-10-08',
    owner_visibility jsonb not null default '{"ai":true,"sms":true,"wa_message":true,"wa_template":true,"other":true,"quantities":true,"unit_prices":false}'::jsonb,
    -- The owner's monthly cap (owner or admin may set it)
    monthly_cap_ghs numeric(12,2) check (monthly_cap_ghs is null or (monthly_cap_ghs > 0 and monthly_cap_ghs <= 1000000)),
    monthly_cap_set_at timestamptz,
    monthly_cap_set_by uuid,
    -- Which cap warnings went out, per period: {"period":"2026-10-29","sent":[80,100]}
    cap_alerts jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now(),
    updated_by uuid
);

alter table public.billing_settings enable row level security;
revoke all on public.billing_settings from anon, authenticated;

-- ONE markup bills the client. The AI cost markup the admin already set
-- (ai_settings.admin_cost_markup_pct) carries over as that markup.
insert into public.billing_settings (id, markup_pct)
select 'default', least(500, greatest(0, coalesce((select (value #>> '{}')::numeric from public.ai_settings where key = 'admin_cost_markup_pct'), 0)))
on conflict (id) do nothing;

comment on table public.billing_settings is
    'Admin-only billing and payout settings (Admin Tools) and the owner''s monthly cap. Service role only.';
