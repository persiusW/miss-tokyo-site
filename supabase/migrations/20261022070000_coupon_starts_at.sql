-- A start date for discount codes, so a code can be scheduled (Discounts,
-- admin v2). Automatic discounts have had starts_at since they were built;
-- codes only had expires_at, so a code worked from the moment it was saved.
--
-- Null means "from when it was created", which is how every existing code
-- already behaves, so nothing changes for them. The eligibility check that
-- reads it lives in src/lib/couponRules.ts and is shared by the checkout
-- preview (/api/checkout/validate-code) and the charge path
-- (lib/discountValidation). It decides only whether a code can be used; what
-- a code is worth is still computeDiscountSplit, unchanged.
alter table public.coupons add column if not exists starts_at timestamptz;

comment on column public.coupons.starts_at is 'When the code starts working. Null: from when it was created.';
