-- The stock-ledger functions and find_order_by_ref were SECURITY DEFINER and,
-- like every new function, executable by PUBLIC — so anyone holding the public
-- anon key could adjust stock or read orders through /rest/v1/rpc. Every caller
-- in the app uses the service role (src/lib/inventory.ts, api/pos/send-link,
-- (shop)/track), so nothing else needs them.
--
-- Not granted to `authenticated`: checkout creates an account for every buyer,
-- so "signed in" means "any customer".

-- ── Stock ledger ─────────────────────────────────────────────────────────────
ALTER FUNCTION public.fn_adjust_stock(uuid, uuid, integer) SECURITY INVOKER;
ALTER FUNCTION public.fn_record_sale(uuid, jsonb, text) SECURITY INVOKER;
ALTER FUNCTION public.fn_apply_stock_movement(uuid, uuid, integer, text, uuid, uuid, uuid, text, text) SECURITY INVOKER;
ALTER FUNCTION public.fn_decrement_stock(uuid, uuid, integer) SECURITY INVOKER;
ALTER FUNCTION public.fn_reserve_online_stock(uuid, jsonb, integer) SECURITY INVOKER;
-- Two overloads exist; lock down both.
ALTER FUNCTION public.fn_reserve_pos_stock(uuid, jsonb) SECURITY INVOKER;
ALTER FUNCTION public.fn_reserve_pos_stock(uuid, jsonb, integer) SECURITY INVOKER;

REVOKE ALL ON FUNCTION public.fn_adjust_stock(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_record_sale(uuid, jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_apply_stock_movement(uuid, uuid, integer, text, uuid, uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_decrement_stock(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_reserve_online_stock(uuid, jsonb, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_reserve_pos_stock(uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_reserve_pos_stock(uuid, jsonb, integer) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.fn_adjust_stock(uuid, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_record_sale(uuid, jsonb, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_apply_stock_movement(uuid, uuid, integer, text, uuid, uuid, uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_decrement_stock(uuid, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_reserve_online_stock(uuid, jsonb, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_reserve_pos_stock(uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_reserve_pos_stock(uuid, jsonb, integer) TO service_role;

-- ── Order lookup (/track) ────────────────────────────────────────────────────
-- Was: id::text ILIKE p_ref || '%' and customer_email ILIKE p_email, both with
-- the caller's input as the pattern, so p_email = '%' matched any order.
-- Now every comparison is an exact match on a normalised value:
--   ref   — the 8-character order ref (orders.ref, or the id prefix it mirrors)
--   email — case-insensitive equality
--   phone — the last 9 digits of each side, so 0XX / +233XX / spaced forms agree
CREATE OR REPLACE FUNCTION public.find_order_by_ref(p_ref text, p_email text DEFAULT NULL::text, p_phone text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, created_at timestamp with time zone, total_amount numeric, status text, items jsonb, customer_name text, shipping_address jsonb, delivery_method text)
 LANGUAGE sql
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
    SELECT o.id, o.created_at, o.total_amount, o.status, o.items, o.customer_name, o.shipping_address, o.delivery_method
    FROM orders o
    WHERE length(p_ref) = 8
      AND (upper(o.ref) = upper(p_ref) OR upper(left(o.id::text, 8)) = upper(p_ref))
      AND (
            (p_email IS NOT NULL AND lower(o.customer_email) = lower(p_email))
         OR (p_phone ~ '^[0-9]{9,}$'
             AND right(regexp_replace(coalesce(o.customer_phone, ''), '[^0-9]', '', 'g'), 9) = right(p_phone, 9))
          )
    LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.find_order_by_ref(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_order_by_ref(text, text, text) TO service_role;
