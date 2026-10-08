-- Orders for a phone number, matched on the last 9 digits of each side, so
-- "024 123 4567", "+233241234567" and "0241234567" are the same customer.
-- Used by the staff Store Assistant. Service role only.
CREATE OR REPLACE FUNCTION public.fn_orders_by_phone(p_last9 text, p_limit int DEFAULT 10)
RETURNS SETOF public.orders
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
    SELECT o.*
    FROM orders o
    WHERE p_last9 ~ '^[0-9]{9}$'
      AND right(regexp_replace(coalesce(o.customer_phone, ''), '[^0-9]', '', 'g'), 9) = p_last9
    ORDER BY o.created_at DESC
    LIMIT least(greatest(coalesce(p_limit, 10), 1), 50);
$function$;

REVOKE ALL ON FUNCTION public.fn_orders_by_phone(text, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_orders_by_phone(text, int) TO service_role;
