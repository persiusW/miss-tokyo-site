-- /rss.xml filters on products.is_wholesale_only, which never existed (42703).
-- Additive; false keeps every current product in the feed.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_wholesale_only boolean NOT NULL DEFAULT false;
