-- Fix category product_count to include secondary categories (category_ids array).
-- Previously only category_id / category_type were counted; products assigned via
-- category_ids (additional categories) were silently excluded.

-- 1. Function: recount all active categories including secondary categories
CREATE OR REPLACE FUNCTION refresh_category_product_counts()
RETURNS void LANGUAGE sql AS $$
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

-- 2. Fix existing data immediately
SELECT refresh_category_product_counts();

-- 3. Trigger function — called after any product change
CREATE OR REPLACE FUNCTION trigger_refresh_category_counts()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM refresh_category_product_counts();
  RETURN NULL;
END;
$$;

-- 4. Statement-level trigger so it runs once per DML operation, not once per row
DROP TRIGGER IF EXISTS products_refresh_category_counts ON products;
CREATE TRIGGER products_refresh_category_counts
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_category_counts();
