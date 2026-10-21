-- Lifetime spend and average order per customer (BACKEND_GAPS 13).
--
-- The old profile page (/customers/[id]) added up total_amount in JS for
-- orders whose status was paid, fulfilled or shipped, matching the email
-- case-sensitively, and nothing stored it, so the list could not sort by it.
-- This view is the one place it is computed now, grouped by lower(email)
-- (the contact key) and using exactly the paid rule of fn_sales_summary and
-- src/lib/utils/metrics.ts: payment_status = 'paid', or, for orders from
-- before the dual-status migration, payment_status is null and status is one
-- of the legacy paid statuses.
--
-- Service role only: the admin reads it on the server.
create or replace view public.customer_spend
with (security_invoker = true) as
select
  lower(o.customer_email) as contact_key,
  count(*)::int as paid_orders,
  sum(coalesce(o.total_amount, 0))::numeric as spent,
  (sum(coalesce(o.total_amount, 0)) / count(*))::numeric as avg_order,
  min(o.created_at) as first_paid_at,
  max(o.created_at) as last_paid_at
from public.orders o
where coalesce(o.customer_email, '') <> ''
  and (o.payment_status = 'paid'
       or (o.payment_status is null
           and o.status in ('paid', 'processing', 'fulfilled', 'delivered', 'packed', 'ready_for_pickup', 'shipped')))
group by lower(o.customer_email);

revoke all on public.customer_spend from public, anon, authenticated;
grant select on public.customer_spend to service_role;
