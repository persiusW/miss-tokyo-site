-- Auto-hide categories with 0 live products; auto-show when products come back.
-- Piggybacks on the existing products_refresh_category_counts trigger so both
-- product_count and is_active stay in sync from a single DML operation.

CREATE OR REPLACE FUNCTION refresh_category_product_counts()
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE categories c
  SET
    product_count = sub.cnt,
    is_active     = (sub.cnt > 0)
  FROM (
    SELECT
      c2.id,
      COUNT(p.id) AS cnt
    FROM categories c2
    LEFT JOIN products p
      ON p.is_active = true
      AND (
        p.category_id = c2.id
        OR p.category_type ILIKE c2.name
        OR (p.category_ids IS NOT NULL AND c2.id = ANY(p.category_ids))
      )
    GROUP BY c2.id
  ) sub
  WHERE c.id = sub.id;
$$;

-- Re-sync immediately so existing empty categories are hidden now
SELECT refresh_category_product_counts();
