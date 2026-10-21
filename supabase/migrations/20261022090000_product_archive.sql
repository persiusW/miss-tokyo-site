-- Products › Archive (admin v2). The new list has Active, Draft and Archived.
-- Draft and Archived are both hidden everywhere (is_active stays false, so no
-- storefront, till or assistant query changes); archived_at only keeps the two
-- apart so the list can file a product under Archived. Additive only.
--
-- A product counts as archived while archived_at is set AND is_active is false.
-- The old admin can still switch an archived product back on with its eye icon;
-- the product then reads as Active again, whatever archived_at says.
alter table public.products add column if not exists archived_at timestamptz;

comment on column public.products.archived_at is
  'When staff archived the product (admin v2). Archived = archived_at set and is_active false.';
