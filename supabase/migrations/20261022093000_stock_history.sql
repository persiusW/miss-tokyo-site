-- Readable stock history (BACKEND_GAPS 10). The stock_movements ledger joined
-- to the order it belongs to (ref and customer) and the staff member who made
-- the change, newest first, for Products › Inventory › History and the product
-- panel. Read-only; the UI turns each reason into plain words
-- (src/lib/admin/v2/catalogue.ts, unit-tested there).
--
-- p_variant_id null = the whole product, including roll-up rebuilds.
-- p_before pages back in time (pass the oldest created_at already shown).
create or replace function public.fn_stock_history(
  p_product_id uuid,
  p_variant_id uuid default null,
  p_limit integer default 50,
  p_before timestamptz default null
)
returns table (
  id uuid,
  created_at timestamptz,
  reason text,
  delta integer,
  applied_delta integer,
  note text,
  variant_id uuid,
  size text,
  color text,
  brand text,
  order_id uuid,
  order_ref text,
  customer_name text,
  actor_name text
)
language sql
stable
set search_path = public
as $$
  select m.id, m.created_at, m.reason, m.delta, m.applied_delta, m.note,
         m.variant_id, v.size, v.color, v.brand,
         m.order_id, o.ref, o.customer_name, pr.full_name
  from public.stock_movements m
  left join public.product_variants v on v.id = m.variant_id
  left join public.orders o on o.id = m.order_id
  left join public.profiles pr on pr.id = m.actor
  where m.product_id = p_product_id
    and (p_variant_id is null or m.variant_id = p_variant_id)
    and (p_before is null or m.created_at < p_before)
  order by m.created_at desc, m.id desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200)
$$;

revoke execute on function public.fn_stock_history(uuid, uuid, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.fn_stock_history(uuid, uuid, integer, timestamptz) to service_role;
