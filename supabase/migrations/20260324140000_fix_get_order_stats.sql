-- Fix get_order_stats: was only summing status = 'paid', now includes all
-- revenue-qualifying statuses to match REVENUE_STATUSES in src/lib/utils/metrics.ts
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
  WHERE status IN ('paid', 'processing', 'fulfilled', 'delivered');
$function$;
