-- The dashboard becomes the source of truth for the admin payout share
-- (owner decision 2026-10-21): a guided cutover on Admin Tools › Payouts
-- replaces the hand-made Paystack split with a per-payment split.
--   payout_bearer  who Paystack books its fee to on the per-payment split:
--                  'account' (default, as today: the main account; customers
--                  pay the fee on top) or 'subaccount'.
--   cutover        the cutover's progress, written by the admin's steps:
--                  {"live_at", "check": {reference, ok, checked_at, expected,
--                  actual}, "retired": {"SPL_x": "<iso>"}}. Reversible.
alter table public.billing_settings
    add column if not exists payout_bearer text not null default 'account'
        check (payout_bearer in ('account', 'subaccount')),
    add column if not exists cutover jsonb not null default '{}'::jsonb;
