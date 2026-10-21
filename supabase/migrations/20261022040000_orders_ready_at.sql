-- Admin v2 Home and the order panel show how long a pickup order has waited
-- for collection (BACKEND_GAPS 20). The app sets ready_at when an order's
-- status becomes ready_for_pickup (updateOrderStatus, updateFulfillmentStatus,
-- bulkUpdateOrderStatus and /api/pickup-ready). Additive only.
alter table public.orders add column if not exists ready_at timestamptz null;

comment on column public.orders.ready_at is
  'When the order was last marked ready for collection. Null when that happened before 2026-10-22 and no activity log records it.';

-- Backfill only where a reliable time exists: the latest activity log that
-- moved this order to ready_for_pickup. Orders marked ready before the
-- activity log recorded order changes keep null, and Home words their row
-- without a number of days.
update public.orders o
set ready_at = a.at
from (
  select resource_id, max(created_at) as at
  from public.activity_logs
  where resource = 'order'
    and (details->>'new_status' = 'ready_for_pickup' or details->>'new_fulfillment_status' = 'ready_for_pickup')
  group by resource_id
) a
where a.resource_id = o.id::text
  and o.ready_at is null
  and (o.status = 'ready_for_pickup' or o.fulfillment_status = 'ready_for_pickup');
