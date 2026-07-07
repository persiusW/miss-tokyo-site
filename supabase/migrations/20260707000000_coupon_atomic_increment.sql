-- Atomic coupon usage increment.
-- Replaces the read-modify-write in the Paystack webhook (two concurrent
-- charges could both read used_count=N and write N+1, losing an increment).
-- Additive only — creates a function, changes no existing objects.

CREATE OR REPLACE FUNCTION public.fn_increment_coupon_usage(p_coupon_id uuid)
RETURNS integer
LANGUAGE sql
AS $$
    UPDATE public.coupons
    SET used_count = COALESCE(used_count, 0) + 1
    WHERE id = p_coupon_id
    RETURNING used_count;
$$;

-- Callable by the service role used in the webhook.
GRANT EXECUTE ON FUNCTION public.fn_increment_coupon_usage(uuid) TO service_role;
