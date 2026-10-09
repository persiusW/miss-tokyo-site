-- Category counts stopped updating: products_refresh_category_counts (created in
-- 20260324150000) is no longer attached in production, so categories.product_count
-- froze. The shop sidebar showed "Bags 0" against 34 live products, and the
-- homepage category tiles read the same column.
--
-- 1. The count function gains a WHERE clause. API sessions preload pg-safeupdate,
--    which rejects an UPDATE without one, so a trigger calling the old body could
--    fail every product save made through the API.
-- 2. Both functions pin search_path (they are SECURITY DEFINER).
-- 3. The trigger fires only when a column that changes the count changes.
--    Every sale updates products.inventory_count; recounting on each of those
--    would lock every category row in the middle of checkout.
-- 4. A category rename or a new category also recounts (matching is by id or name).
-- 5. Only service_role may call the functions directly. A trigger fires whatever
--    the caller's EXECUTE rights.

CREATE OR REPLACE FUNCTION public.refresh_category_product_counts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE categories c
  SET product_count = (
    SELECT COUNT(*)
    FROM products p
    WHERE p.is_active = true
    AND (
      p.category_id = c.id
      OR p.category_type ILIKE c.name
      OR (p.category_ids IS NOT NULL AND c.id = ANY(p.category_ids))
    )
  )
  WHERE c.id IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.trigger_refresh_category_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_category_product_counts();
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refresh_category_product_counts() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_refresh_category_counts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_category_product_counts() TO service_role;

CREATE OR REPLACE TRIGGER products_refresh_category_counts
  AFTER INSERT OR DELETE OR UPDATE OF is_active, category_id, category_type, category_ids
  ON public.products
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_refresh_category_counts();

-- The recount writes product_count only, so it cannot re-fire this trigger.
CREATE OR REPLACE TRIGGER categories_refresh_category_counts
  AFTER INSERT OR UPDATE OF name
  ON public.categories
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_refresh_category_counts();

SELECT public.refresh_category_product_counts();
