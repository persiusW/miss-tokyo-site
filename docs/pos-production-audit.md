# POS production-readiness audit — 2026-07-23

Scope: the POS feature under sales-event conditions — several staff on tills at
once, storefront customers checking out concurrently, limited stock.

POS is live: POS History shows paid sessions from staff on 23/07/2026, so
everything below describes behaviour against real traffic.

Reference for "how it should look": `fn_reserve_online_stock`
(`20260504000000_online_reservations.sql`). The online reservation path was
hardened in that migration; **POS was never brought up to the same standard**.
Most findings are that gap.

---

## Fixed on this branch

### 1. Variant-tracked products decremented nothing — silent oversell (CRITICAL)

`src/app/(dashboard)/pos/page.tsx:134` always set `variantId: null`; the till
only knows a product's `available_sizes` / `available_colors` and never resolves
a variant row.

The webhook (`src/app/api/paystack/webhook/route.ts`) branched on
`product.track_variant_inventory && item.variantId`. With `variantId` always
null, every variant-tracked POS sale fell through to:

```
console.warn("[POS webhook] inventory skip: track_variant_inventory=true but variantId missing")
```

**Stock never moved.** The item stayed sellable indefinitely, on the till *and*
on the storefront. On a sales event with variant products this oversells without
limit. Note the code comment directly above it asserted the opposite
("POS items carry variantId as a UUID directly") — the comment was wrong.

Fix: `/api/pos/send-link` resolves size/colour/brand to a real variant id using
`normAttr`, the same lookup `fallbackDecrementFromItems` uses, and stores it on
the session items. A variant-tracked line matching no variant row is now
**refused** rather than sold outside stock control.

### 2. Two sizes of one product broke the sale (HIGH)

`idx_pos_reservations_no_duplicate` was `(product_id, pos_session_id)` — no
`variant_id`. Two cart lines for the same product (two sizes — routine during a
sale) produced two inserts that collided on that index, so
`fn_reserve_pos_stock` raised a unique violation and the staff member saw a raw
Postgres error string.

`online_reservations` had this right: `(product_id, variant_id, order_id) NULLS NOT DISTINCT`.

Fix: index rebuilt to match, and the function now sums duplicate
(product, variant) lines instead of colliding.

### 3. Two tills could deadlock (HIGH)

`fn_reserve_pos_stock` looped `jsonb_array_elements(p_items)` with no ordering.
`fn_reserve_online_stock` sorts by `product_id` first and says why:

> Without a consistent order, two sessions locking [A, B] and [B, A]
> simultaneously will deadlock.

POS took row locks in cart order. Two staff sending carts containing the same
two products in opposite order deadlock — exactly the scenario a sales event
creates.

Fix: same deterministic `ORDER BY` applied.

### 4. Lost-update oversell on settlement (HIGH)

The webhook decremented with read-modify-write:
`Math.max(0, product.inventory_count - qty)` — value read in one statement,
written in another. Two POS orders for the same product settling together lose
one decrement.

Fix: new `fn_decrement_stock` does it in a single atomic `UPDATE`. This also
removes a violation of the invariant declared at the top of `src/lib/inventory.ts`
("THE ONLY FILE ALLOWED TO WRITE TO inventory_count COLUMNS") — the webhook was
writing those columns directly.

### 5. Till showed stock it did not have (MEDIUM)

The product grid rendered raw `products.inventory_count`, ignoring live
reservations. Two staff both saw "2 left" on the same last two units and both
promised them; the loser only found out at Send Link.

Fix: the grid now shows `fn_available_stock_bulk` — on-hand minus POS holds
minus online holds — in one batched call. Falls back to the raw count if the
RPC is unavailable, so it degrades quietly.

### 6. De-listed and pre-order products (MEDIUM)

`fn_reserve_pos_stock` never re-checked `is_active`, so the till could sell a
product pulled from sale, and it had no pre-order bypass, so a pre-order product
could never pass the stock check — POS could not sell pre-orders at all. Both
checks exist in the online function; both are now in the POS one.

---

## Found, NOT fixed — needs a decision

### 7. Gift card double-spend across concurrent sessions (HIGH)

`validateDiscountCode` reads a gift card balance but places no hold. Two tills
can apply the same card to two baskets at the same time; both get the discount,
both settle, and `trackDiscountUsage` debits twice. The `Math.min` clamp stops
the balance going negative, but the second order was still discounted against
money that was already spent.

Fixing properly means reserving gift-card value at send-link the way stock is
reserved. That is a real piece of work and touches the storefront too — the same
race exists there.

### 8. Coupon usage limit can be exceeded (MEDIUM)

`usage_limit` is checked at validate time and incremented at settlement, with no
lock between. Concurrent redemptions of a last-use coupon all pass the check.
The increment itself is atomic (`fn_increment_coupon_usage`); the check is not.

### 9. Storefront `confirmSale` has the same read-modify-write (MEDIUM)

`src/lib/inventory.ts` claims the reservation atomically (delete-and-return), so
one order can't double-decrement — but the decrement itself still reads then
writes. Two *different* orders for the same product settling together lose an
update, exactly as POS did. `fn_decrement_stock` now exists and can be adopted
here.

### 10. Expiry depends on traffic (LOW)

`/api/pos/expire` is triggered from the customer's `/pay/[pos_id]` page. A
session nobody opens keeps its `pending_payment` status until something else
fires the endpoint. Availability is unaffected — `fn_combined_available_stock`
filters on `expires_at > NOW()`, so a stale hold stops counting on time — but
POS History will show stale "pending" rows. A cron would tidy it.

---

## Migration

`20260723030000_pos_concurrency_hardening.sql` — rebuilds the reservation
uniqueness index, replaces `fn_reserve_pos_stock`, and adds
`fn_available_stock_bulk` and `fn_decrement_stock`. Additive apart from the index
rebuild; no data is dropped.

**Deploy order matters:** apply the migration before the code, or `send-link`
will fail on the missing `fn_decrement_stock` / `fn_available_stock_bulk`.
