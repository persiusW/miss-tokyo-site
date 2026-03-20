UPDATE products p
SET category_type = c.name
FROM categories c
WHERE p.category_type = c.slug OR LOWER(p.category_type) = LOWER(c.slug);
