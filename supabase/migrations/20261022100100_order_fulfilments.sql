-- Partial fulfilment: "Partly sent", "4 of 6 still to send" (BACKEND_GAPS 5).
--
-- One row per parcel packed from the admin's "Mark as packed" panel. items:
-- [{ index, quantity }], the order lines and how many of each went in. An
-- order that never uses it has no rows and nothing about it changes.
--
-- The order's fulfillment_status is derived from these rows: 'partial' while
-- some units are left, then 'packed' through updateOrderStatus once the last
-- parcel is packed. 'partial' keeps status 'paid' (FULFILLMENT_TO_STATUS in
-- sales/orders/actions.ts), so the old admin still lists it under Inbox.
--
-- RLS on with no policies: only the service role reads or writes it.
create table if not exists public.order_fulfilments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) > 0),
  status text not null default 'packed' check (status in ('packed', 'shipped', 'delivered')),
  rider_id uuid references public.riders(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists order_fulfilments_order_created on public.order_fulfilments (order_id, created_at);

alter table public.order_fulfilments enable row level security;
revoke all on public.order_fulfilments from public, anon, authenticated;
grant select, insert, update, delete on public.order_fulfilments to service_role;

-- Extend whatever fulfillment_status allows right now with 'partial'.
-- Re-runnable: does nothing when it is already allowed.
do $$
declare vals text[];
begin
  select array_agg(m[1] order by ord) into vals
  from pg_constraint c, regexp_matches(pg_get_constraintdef(c.oid), '''([^'']+)''', 'g') with ordinality as r(m, ord)
  where c.conname = 'orders_fulfillment_status_check' and c.conrelid = 'public.orders'::regclass;
  if vals is null or 'partial' = any(vals) then return; end if;
  vals := vals || 'partial'::text;
  alter table public.orders drop constraint orders_fulfillment_status_check;
  execute 'alter table public.orders add constraint orders_fulfillment_status_check check (fulfillment_status = any (array['
    || (select string_agg(quote_literal(v) || '::text', ', ') from unnest(vals) v) || ']))';
end $$;
