# Discount races — findings and proposal

2026-07-24. Covers the four items left open after the POS concurrency audit.

---

## The shared defect

Coupons and gift cards are **checked when the customer applies them** and the
ledger is **written only at settlement**, with nothing reserving the value in
between. Stock solved this years ago with reservations; discounts never got the
same treatment.

```
apply ─────────────── pay ─────────────── settle
  ▲                                          ▲
  check balance / limit             write balance / count
  └──────────── nothing holds it ────────────┘
```

Two tills, or a till and a storefront customer, can pass the same check and both
proceed to payment.

- **Gift card:** both orders are discounted, but only one card's worth of money
  exists. The store eats the difference.
- **Coupon:** `usage_limit` is exceeded by however many redemptions are in
  flight at once.

---

## Done on this branch — the ledger side is now safe

Migration `20260724000000_discount_race_hardening.sql`.

`fn_claim_coupon_use(coupon_id)` increments **only if** that keeps
`used_count < usage_limit`, in one statement under the row lock, and returns
whether it claimed. The previous `fn_increment_coupon_usage` incremented
unconditionally, so concurrent redemptions all succeeded.

`fn_redeem_gift_card(card_id, amount)` debits **only if**
`remaining_value >= amount`, and returns the amount actually taken. The previous
path read the balance and wrote `balance - amount` as two separate statements —
the classic lost update, and the reason one card could be spent twice.

**What this changes:** a card can no longer be overdrawn and a coupon can no
longer pass its cap. The ledger is now always truthful.

**What this does NOT change:** the customer was already quoted and charged the
discounted amount. When the second settlement finds nothing left to fund it, the
order still stands and the shortfall is real. Both cases now log loudly rather
than corrupting the balance silently:

```
[webhook] gift card could not fund this order — balance already spent
[webhook] coupon over-redeemed: limit already reached at settlement
```

Grep for those. They should never appear; if they do, that is money to reconcile.

---

## Proposed — holds, to stop the quote being made at all

The real fix mirrors `online_reservations` / `pos_reservations`.

### Schema

```sql
CREATE TABLE public.discount_holds (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind         TEXT NOT NULL CHECK (kind IN ('coupon','gift_card')),
    code_id      UUID NOT NULL,              -- coupons.id | gift_cards.id
    order_id     UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    pos_session_id UUID REFERENCES public.pos_sessions(id) ON DELETE CASCADE,
    amount       NUMERIC NOT NULL CHECK (amount > 0),  -- gift cards only
    expires_at   TIMESTAMPTZ NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (order_id IS NOT NULL OR pos_session_id IS NOT NULL)
);
```

### Available balance becomes a function, exactly like stock

```sql
-- gift card: remaining_value − live holds
-- coupon:    usage_limit − used_count − live holds
```

`validateDiscountCode` reads that instead of the raw column, so a second till
sees the card as already spent.

### Flow

| Point | Action |
|---|---|
| `/api/pos/send-link`, `/api/paystack/initialize` | place hold with the same 30-min TTL as the stock reservation |
| settlement | claim the hold and write the ledger (the functions shipped above) |
| expiry cron | holds lapse; `expires_at > NOW()` filtering means no cleanup is needed for correctness |

Both entry points already reserve stock at exactly these moments, so the hold
slots into an existing transaction boundary rather than adding a new one.

### Cost and risk

Roughly one migration plus edits to `discountValidation.ts`, `send-link`,
`initialize` and the webhook. The risk to watch is a hold that outlives its order
and blocks a legitimate re-use — the TTL plus the `expires_at` filter is what
stock already relies on for that, so the pattern is proven here.

**Recommendation:** worth doing before the next sales event *if* gift cards are
promoted during it. If gift cards are rare in practice, the loud logs shipped
above may be enough to catch the handful of cases and reconcile manually — the
money is bounded by card value, unlike an oversell.

---

## POS session expiry — fixed

`/api/pos/expire` only ever fired when a customer opened `/pay/[pos_id]`, so a
link nobody opened stayed `pending_payment` indefinitely.

Rather than add a fourth Vercel cron, POS expiry now runs inside the existing
`/api/cron/expire-reservations` job (every 5 min), which already does the
identical thing for online reservations. It follows that job's deliberate
choice to mark the session expired but **leave the reservation rows alone**:
`fn_combined_available_stock` ignores holds past `expires_at`, so stock frees
itself, and a late Paystack webhook can still settle the session — the status
gate in `handlePosPayment` accepts `expired`.

Availability was never affected by this, so it was bookkeeping only. The stale
"pending" rows in POS History are what it actually fixes.

---

## The 5 checkout e2e failures — not a product bug

**Production `/shop` is healthy.** `https://www.misstokyo.shop/shop` renders
product links for a guest (verified by curl). Note that `misstokyo.shop`
307-redirects to `www.` — a curl without `-L` shows an empty body and looks like
a broken page.

**3 of the 5 were a stale local dev cache.** `npm run clean` plus a dev restart
fixed them: the shop grid, PDP and quick-add tests now pass. This is the failure
mode already documented in CLAUDE.md.

**The remaining 2 are the stock guard doing its job.** Checkout disables Pay
while `stockError` is set, and the fixture's cart quantity exceeds what the seed
products actually have — TEST1 and TEST2 carry 2–3 units, and the suite runs
against the shared production database where live POS holds reduce availability
further. The button was correctly disabled; the tests assume stock that is not
there.

Fix belongs in the fixture, not the app: seed a dedicated high-stock,
untracked (`track_inventory = false`, the 9999 sentinel) product for checkout
tests so they never compete with real inventory. Left alone here because it
changes test data on a shared database and is worth doing deliberately.
