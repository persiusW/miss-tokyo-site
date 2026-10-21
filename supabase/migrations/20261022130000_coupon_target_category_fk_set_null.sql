-- coupons has two columns for a code's category: category_id (written by the
-- old Discounts page and the new panel) and target_category_id (never written
-- until now; both are kept equal on save from 2026-10-22). category_id's
-- foreign key clears itself when a category is deleted; target_category_id's
-- had no ON DELETE action, so once it is filled a category with a code on it
-- could no longer be deleted. Give it the same ON DELETE SET NULL.
-- Constraint only: no column or row is dropped. Every row is NULL today, so
-- re-validating the key is instant.
alter table public.coupons drop constraint if exists coupons_target_category_id_fkey;
alter table public.coupons
    add constraint coupons_target_category_id_fkey
    foreign key (target_category_id) references public.categories(id) on delete set null;
