-- ============================================================
-- Discount race hardening (additive — creates functions only)
--
-- Both the coupon usage_limit gap and the gift-card double-spend have the
-- same shape: the code is CHECKED when the customer applies it, and the
-- ledger is only WRITTEN at settlement, with nothing holding it in between.
-- Two orders can pass the same check and both settle.
--
-- These functions make the settlement write itself safe: the check and the
-- write happen in one statement, under the row lock, so a second claim
-- cannot overdraw a card or push a coupon past its limit.
--
-- They do NOT stop the customer being quoted a discount that later fails to
-- fund — that needs a hold placed at apply time. See
-- docs/discount-race-proposal.md.
-- ============================================================

-- 1. Claim one coupon use, refusing if that would exceed usage_limit.
--    Returns TRUE when the use was claimed.
--    Supersedes fn_increment_coupon_usage, which incremented unconditionally.
CREATE OR REPLACE FUNCTION public.fn_claim_coupon_use(p_coupon_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    claimed INTEGER;
BEGIN
    UPDATE public.coupons
    SET used_count = COALESCE(used_count, 0) + 1
    WHERE id = p_coupon_id
      AND (usage_limit IS NULL OR COALESCE(used_count, 0) < usage_limit)
    RETURNING used_count INTO claimed;

    RETURN claimed IS NOT NULL;
END;
$$;

-- 2. Debit a gift card, refusing if the balance will not cover it.
--    Returns the amount actually debited (0 when the balance was insufficient),
--    so the caller can tell a funded redemption from an unfunded one.
--
--    The old path read remaining_value, then wrote balance - amount in a
--    separate statement — two settlements both read the same balance and the
--    card was spent twice.
CREATE OR REPLACE FUNCTION public.fn_redeem_gift_card(
    p_card_id UUID,
    p_amount  NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
    new_balance NUMERIC;
BEGIN
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RETURN 0;
    END IF;

    UPDATE public.gift_cards
    SET remaining_value = ROUND(remaining_value - p_amount, 2),
        updated_at      = NOW(),
        is_active       = CASE WHEN ROUND(remaining_value - p_amount, 2) <= 0 THEN FALSE ELSE is_active END,
        status          = CASE WHEN ROUND(remaining_value - p_amount, 2) <= 0 THEN 'redeemed' ELSE status END
    WHERE id = p_card_id
      AND remaining_value >= p_amount
    RETURNING remaining_value INTO new_balance;

    IF new_balance IS NULL THEN
        RETURN 0;   -- insufficient balance; nothing was debited
    END IF;

    RETURN p_amount;
END;
$$;
