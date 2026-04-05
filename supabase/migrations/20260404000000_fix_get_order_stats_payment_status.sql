-- Fix get_order_stats: switch from legacy status filter to payment_status = 'paid'
-- After the dual_order_status migration, packed and ready_for_pickup orders have
-- payment_status = 'paid' but were excluded from the old status IN (...) filter.
-- This caused lifetime revenue on the overview to be lower than 30-day analytics revenue.
CREATE OR REPLACE FUNCTION public.get_order_stats()
 RETURNS json
 LANGUAGE sql
 STABLE
AS $function$
  SELECT json_build_object(
    'total_revenue', COALESCE(SUM(total_amount), 0),
    'order_count', COUNT(*)
  )
  FROM orders
  WHERE payment_status = 'paid';
$function$;
