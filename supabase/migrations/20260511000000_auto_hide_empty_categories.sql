-- Storefront hides empty categories via product_count > 0 filter (not is_active).
-- is_active remains the admin's manual toggle — this migration only ensures
-- product_count is kept accurate so the storefront filter works correctly.

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

-- Re-sync counts immediately
SELECT refresh_category_product_counts();
