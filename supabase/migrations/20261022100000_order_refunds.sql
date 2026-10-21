-- Real refunds, full or partial (BACKEND_GAPS 4).
--
-- One row per refund. POST /api/admin/orders/[id]/refund (owners and admins,
-- checked on the server) claims the row by idempotency_key first, then asks
-- Paystack (card and Mobile money) or only records it (cash, gift card, or a
-- refund already made in the Paystack dashboard). The Paystack webhook moves
-- a pending refund to processed or failed.
--
-- items: the order lines refunded, [{ index, product_id, variant_id, name,
-- quantity, price }]. restock says whether those units went back on sale;
-- reconcileOrderStock reads both so a later status change never undoes a
-- restock or brings back units written off as damaged.
--
-- orders.refunded_total is the sum of refunds that did not fail, kept by the
-- endpoint and the webhook. A partly refunded order keeps payment_status
-- 'paid' on purpose: every revenue figure, the "waiting to pack" view and the
-- stock-hold rule read payment_status = 'paid', and a new value there would
-- silently drop these orders out of all of them. The badge reads
-- refunded_total instead. A full refund sets payment_status 'refunded', as the
-- old Refund button did.
--
-- store_settings.refunds_live is the kill switch for sending refunds through
-- Paystack. Off by default: while off, card and Mobile money refunds are
-- refused with a calm message (refund in the Paystack dashboard, then record
-- it here); record-only refunds still work.
--
-- RLS on with no policies: only the service role reads or writes refunds.
create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  amount_ghs numeric(12,2) not null check (amount_ghs > 0),
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  reason text check (reason is null or char_length(reason) <= 200),
  restock boolean not null default false,
  method text not null check (method in ('paystack', 'cash', 'gift_card', 'recorded')),
  status text not null default 'pending' check (status in ('pending', 'processed', 'failed', 'recorded')),
  paystack_refund_ref text,
  failure text check (failure is null or char_length(failure) <= 200),
  notify boolean not null default false,
  actor uuid references public.profiles(id) on delete set null,
  idempotency_key text not null unique check (char_length(idempotency_key) between 8 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists refunds_order_created on public.refunds (order_id, created_at);
create index if not exists refunds_paystack_ref on public.refunds (paystack_refund_ref) where paystack_refund_ref is not null;

alter table public.refunds enable row level security;
revoke all on public.refunds from public, anon, authenticated;
grant select, insert, update, delete on public.refunds to service_role;

alter table public.orders add column if not exists refunded_total numeric(12,2) not null default 0;
comment on column public.orders.refunded_total is
  'Sum of refunds rows for this order that did not fail. payment_status stays paid for a partial refund.';

alter table public.store_settings add column if not exists refunds_live boolean not null default false;
comment on column public.store_settings.refunds_live is
  'When true, card and Mobile money refunds from the admin go through the Paystack Refund API. Off: staff refund in the Paystack dashboard and record it.';
