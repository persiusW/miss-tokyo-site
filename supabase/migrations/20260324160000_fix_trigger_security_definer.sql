-- Fix: both functions must be SECURITY DEFINER so the UPDATE categories
-- inside the trigger runs with elevated privileges, not the calling user's RLS context.
-- Without this, product visibility toggles from the browser client fail with a 400
-- because the trigger fires as the authenticated user who lacks a direct UPDATE grant
-- on the categories table.

CREATE OR REPLACE FUNCTION refresh_category_product_counts()
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
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
  );
$$;

CREATE OR REPLACE FUNCTION trigger_refresh_category_counts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM refresh_category_product_counts();
  RETURN NULL;
END;
$$;
