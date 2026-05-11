# Inventory Oversell & Checkout Review
**Date:** 2026-05-03  
**Branch:** feat/pre-order  
**Scope:** All stock management, cart, checkout, and variant handling code vs. the IMS Specification

---

## Executive Summary

The system has **three independently exploitable oversell paths** and **five checkout button verification gaps**. The largest structural problem is that there is no reservation layer — stock is only decremented after a successful Paystack webhook fires, not when a customer begins checkout. Two customers can both pass the stock gate, both pay, and both receive confirmation for the same last unit. The caching system compounds this by serving inventory counts that are up to 60 seconds stale. The checkout button does no live re-validation of cart items that have been sitting in localStorage for minutes, hours, or indefinitely.

---

## 1. The Missing Reservation Layer (Critical — Root Cause of Oversell)

### What should happen (per IMS Spec §6)
When a customer begins checkout, stock should be **soft-reserved** — atomically moved from `available` to `reserved`. The reserve is held for a TTL (15 min cart, 30 min checkout, 10 min payment). No other buyer can claim those units during the TTL. On payment success, the reservation converts to a fulfilled deduction. On payment failure or expiry, stock is released.

### What actually happens
There is no reservation table and no soft-hold mechanism. The flow is:

```
Customer A              Customer B              DB (inventory_count = 1)
────────────────────    ────────────────────    ────────────────────────
POST /paystack/init  →  POST /paystack/init  →  READ: count = 1 ✓
(stock check: 1 ≥ 1)    (stock check: 1 ≥ 1)    (both pass simultaneously)
Redirect → Paystack     Redirect → Paystack
Pay (success)           Pay (success)
Webhook fires           Webhook fires
UPDATE count = 0   ←    UPDATE count = 0   ←    Both write 0. OVERSELL.
```

The stock check in `src/app/api/paystack/initialize/route.ts:77-131` is a read-then-check with no lock. The reservation of stock only happens implicitly when the webhook decrements `inventory_count` — which can be 5–30+ minutes after the stock check. Any concurrent checkout that passes the stock gate before the first webhook fires will oversell.

**Files:**
- `src/app/api/paystack/initialize/route.ts:77–131` — stock check, no lock
- `src/app/api/paystack/webhook/route.ts:508–609` — actual decrement, runs much later

---

## 2. Webhook Race Condition on Concurrent Paystack Events (High)

### The pattern
The webhook decrement logic is:

```typescript
// webhook/route.ts:537–545
const { stock } = productMap.get(item.productId)!;
return supabaseAdmin.from("products")
  .update({ inventory_count: Math.max(0, stock - item.quantity) })
  .eq("id", item.productId);
```

This is a **read-then-write**. If two webhook calls arrive for different orders simultaneously (or Paystack retries a failed webhook), both read the same `stock` value and both write `stock - qty`. The second write overwrites the first, undoing its deduction.

**Example:**
```
stock = 3 at DB
Webhook A reads: stock = 3 → writes 3 - 1 = 2
Webhook B reads: stock = 3 → writes 3 - 1 = 2  (should be 1)
Final DB: 2  (one deduction lost — that unit is now phantom stock)
```

### Idempotency check gap
The webhook has an idempotency check (line 416: skip if order already `paid`/`confirmed`). But the check runs **before** the stock decrement, and the order status update runs **after** the stock decrement (line 672+). There is a TOCTOU window:

```
Webhook 1: check → not processed
Webhook 2: check → not processed        (arrives before W1 updates status)
Webhook 1: decrement stock → update order status: paid
Webhook 2: decrement stock → update order status: paid (blocked by .in("payment_status",["pending"]) — but stock already double-decremented)
```

The fix for the order double-update exists, but it does not protect against double stock decrements.

**File:** `src/app/api/paystack/webhook/route.ts:508–609`

---

## 3. Caching Delay — Stale Stock Shown on Site (High)

### Current cache timers

| Location | Cache Key | Revalidate TTL | Effect |
|---|---|---|---|
| `src/lib/products.ts:66` | `products-list` | **60 seconds** | Shop listing page shows stock counts up to 1 min stale |
| `src/app/(shop)/products/[slug]/page.tsx:60` | `export const revalidate = 60` | **60 seconds** | Product page ISR — entire page served stale |
| `src/lib/products.ts:56` | `categories-name-map` | **300 seconds** | Category metadata 5 min stale |
| `src/app/(shop)/products/[slug]/page.tsx:20` | `active-auto-discounts-pdp` | **300 seconds** | Auto discount rules 5 min stale |
| `src/app/(shop)/products/[slug]/page.tsx:36` | `pdp-settings` | **300 seconds** | PDP settings 5 min stale |

This means:
- A product that just sold its last unit is still shown as "In Stock" to all visitors for up to 60 seconds.
- The "Add to Cart" button is not disabled for those visitors.
- `RealtimeStockMonitor` fires a toast on DB update, but only to users already on the page — it does not prevent new visitors from seeing stale stock.

### What was done as a workaround
`revalidatePath()` is called in the webhook for affected product slugs (`webhook/route.ts:601-609`). This invalidates the ISR cache on successful payment. But:
- It only fires after payment — not during checkout
- It does not address the 60-second TTL on the products-list cache
- It does not update inventory counts for users currently browsing

**We will remove the TTL-based cache delay for inventory-relevant data.** The `getCachedProducts` revalidate should be removed or reduced to 0 for `inventory_count`, and the PDP `revalidate` export should be 0 or rely solely on on-demand revalidation via `revalidatePath`.

---

## 4. `isPreOrder` Flag Frozen at Cart-Add Time (Medium)

### The vulnerability
When a customer adds an item to cart, the cart item is stamped with `isPreOrder: true/false` from the product's state at that moment (`useCart.ts:6–24`). This value is persisted to `localStorage` via Zustand persist.

All stock checks in the initialize route use this client-supplied `isPreOrder` value:

```typescript
// initialize/route.ts:71, 83, 102, 144
if (item.isPreOrder) continue; // bypass ALL stock checks
```

**Attack vector / stale-cart scenario:**
1. Admin enables `preorder_enabled` on a product. Customer adds it to cart — cart item gets `isPreOrder: true`.
2. Admin later disables `preorder_enabled`. Product is back to normal stock rules.
3. Customer's cart item still has `isPreOrder: true`.
4. Customer proceeds to checkout days later.
5. ALL stock checks are bypassed. Customer checks out a zero-stock product as if it were a pre-order.

The server does not re-verify `preorder_enabled` from the DB at checkout time — it trusts the client-supplied value from the cart.

**File:** `src/app/api/paystack/initialize/route.ts:71, 83, 102, 144`

---

## 5. No `is_active` Check in the Checkout Stock Gate (Medium)

### The gap
The initialize route fetches products for stock checking without an `is_active` filter:

```typescript
// initialize/route.ts:55–58
const { data: dbProducts } = await supabaseAdmin
  .from("products")
  .select("id, price_ghs, is_sale, discount_value, inventory_count, track_variant_inventory")
  .in("id", pIds);
// ← No .eq("is_active", true) filter
```

If an admin deactivates a product (`is_active = false`) but forgets to zero out `inventory_count`, customers who have that product in their cart can still check out successfully. The product page would 404 (because `getProductBySlug` uses `.or("is_active.eq.true,is_active.is.null")`), but the order goes through.

**File:** `src/app/api/paystack/initialize/route.ts:54–58` and `134–141`

---

## 6. Cart Drawer — No Live Stock Re-validation (High)

### What happens
The cart drawer (`CartDrawer.tsx`) opens and:
- Fetches auto discount rules (line 35–39)
- Does **not** query the DB for current stock of any cart item
- Displays `item.inventoryCount` from localStorage — the value frozen at cart-add time
- The Checkout button is always enabled if `items.length > 0`

A customer can have a cart full of items that were in stock 2 hours ago. None will be flagged as potentially unavailable. The Checkout button is always green.

**Gap vs. spec:** Per IMS Spec §6.3, any item in cart for longer than the reservation TTL (15 minutes) should be treated as unconfirmed and re-validated before proceeding to checkout.

**File:** `src/components/ui/miss-tokyo/CartDrawer.tsx:27–46`

---

## 7. Checkout Page — No Pre-Submit Stock Re-check (High)

### What happens
The checkout page (`checkout/page.tsx`) mounts and:
- Renders all cart items from Zustand store
- Fetches fee settings and auto discounts
- Does **not** hit the server to verify any cart item is still in stock, still active, or still exists

The "Pay GHS X.XX" button is enabled as soon as the form validates (all required fields filled). Stock is only verified at the moment the button is clicked and `POST /api/paystack/initialize` fires.

This means a customer can fill in all their details, see their order summary with items that are no longer available, and only discover the problem at the final click.

**For products that have been in cart a long time:**
- `inventoryCount` in cart item is frozen at add-time
- The checkout UI shows the frozen count with no staleness indicator
- No "may have sold out" warning even for items added hours/days ago

**For products removed from live:**
- Items from deactivated products appear normally in checkout
- No warning that the product is no longer listed
- Server-side rejects only if `inventory_count = 0` (not if `is_active = false` with stock > 0)

**File:** `src/app/(shop)/checkout/page.tsx:93–147` (useEffect: does everything except stock re-check)

---

## 8. Variant Stock Check Has a Normalisation Gap (Medium)

### The issue
The variant-level stock check in the initialize route builds a lookup key:

```typescript
// initialize/route.ts:116
const key = `${v.product_id}|${normAttrInit(v.size)}|${normAttrInit(v.color)}|${normAttrInit(v.stitching)}`;
```

And the cart item key:
```typescript
// initialize/route.ts:121
const key = `${item.productId}|${normAttrInit(item.size)}|${normAttrInit(item.color)}|${normAttrInit(item.stitching)}`;
```

`normAttrInit` normalises dashes and trims. But `item.size` in the cart is whatever was selected in the UI — which goes through a completely different formatting path (`formatSize` in `ProductCheckoutForm.tsx:43–45`), converting "M" to "M — 10" (em-dash with spaces). The webhook uses `normAttr` (same logic) and this has been tested and works. But if the `normAttrInit` function in the initialize route diverges from the webhook's `normAttr` function, variants will fail to match, stock checks will return `variantStock = undefined`, and the `undefined !== undefined` guard passes through.

**The two functions should be shared, not duplicated.** Currently:
- `webhook/route.ts:558` defines `normAttr` locally
- `initialize/route.ts:109` defines `normAttrInit` locally (identical logic, different name)

Any future change to one will silently break the other.

---

## 9. OOS Soft-Pass vs Hard-Block Inconsistency (Medium)

### Two conflicting stock checks in the same route

**Check 1 (Hard block, lines 77–131):** Uses `dbStockMap` built from the first product query. Blocks with 409 if `totalQty > stock`.

**Check 2 (Soft OOS, lines 133–160):** Uses `stockMap` built from a **second, separate query** to the same `products` table. Adds to `oosItems` array. Only returns 409 if **all** cart products are OOS.

This means:
- Two DB queries run for the same products list (wasted latency)
- There is a theoretical consistency gap: the two queries can return different `inventory_count` values if another webhook fires between them
- A multi-item cart where 1 item is OOS but 1 is in-stock: the hard block at step 1 should catch it, but if it doesn't (e.g. track_inventory edge case), the soft check passes it through and charges the customer for something OOS

The `oosItems` are stored in `sessionStorage` and shown on the success page — meaning the customer is charged and the order is recorded including the OOS item, with the expectation that ops will catch it manually.

**File:** `src/app/api/paystack/initialize/route.ts:77–160`

---

## 10. `RealtimeStockMonitor` Only Watches Product-Level Stock (Low)

`RealtimeStockMonitor.tsx` subscribes to `postgres_changes` on the `products` table only. It fires a toast when `inventory_count < 5`.

It does **not** watch `product_variants`. So when a variant's `inventory_count` drops to 0 (via variant-level tracking), no toast is shown to the current visitor. The UI remains interactive for that variant until the page ISR refreshes (up to 60 seconds).

**File:** `src/components/ui/miss-tokyo/RealtimeStockMonitor.tsx:9–24`

---

## Summary Table

| # | Issue | Severity | Oversell Risk | File |
|---|---|---|---|---|
| 1 | No reservation layer — stock not held during Paystack payment window | **Critical** | Direct | `paystack/initialize`, `paystack/webhook` |
| 2 | Webhook read-then-write race — concurrent webhooks can double-decrement or skip deduction | **High** | Direct | `paystack/webhook:508–609` |
| 3 | Cache TTL delay — inventory counts up to 60s stale on site | **High** | Indirect | `lib/products.ts`, `products/[slug]/page.tsx` |
| 4 | `isPreOrder` trusted from client — frozen at cart-add, not re-verified server-side | **Medium** | Direct | `paystack/initialize:71,83,102,144` |
| 5 | No `is_active` check in checkout stock gate | **Medium** | Indirect | `paystack/initialize:54–58,134–141` |
| 6 | Cart drawer checkout button — no live stock re-validation | **High** | UX + Oversell | `CartDrawer.tsx:27–46` |
| 7 | Checkout page — no pre-submit stock re-check; stale cart items show no warning | **High** | UX + Oversell | `checkout/page.tsx:93–147` |
| 8 | Variant key normalisation duplicated in two places — will diverge | **Medium** | Latent | `initialize:109`, `webhook:558` |
| 9 | Two conflicting stock check strategies in same route | **Medium** | UX | `paystack/initialize:77–160` |
| 10 | `RealtimeStockMonitor` misses variant-level OOS events | **Low** | UX | `RealtimeStockMonitor.tsx` |

---

## Recommended Fixes (Priority Order)

### P0 — Reserve stock atomically at initialize time
Create a `reservations` table. In `/api/paystack/initialize`, after passing the stock check, atomically:
1. `UPDATE products SET inventory_count = inventory_count - qty WHERE id = $id AND inventory_count >= qty`  
   (Supabase `.rpc()` or raw SQL via a DB function — the condition in the WHERE clause is the atomic guard)
2. Insert a `reservations` row with TTL = 30 minutes
3. In the webhook on `charge.success`, mark reservation as fulfilled (no second decrement needed)
4. In the webhook on `charge.failed` / a cron for expired TTLs, release the reservation

This eliminates issue #1 and most of #2.

### P1 — Remove the cache delay timers for inventory data
In `src/lib/products.ts`:
- Remove `getCachedProducts` (or set `revalidate: 0`) — rely on on-demand revalidation via `revalidatePath` in the webhook
- Keep the 300s TTL only for non-inventory data (categories, settings, copy)

In `src/app/(shop)/products/[slug]/page.tsx`:
- Remove `export const revalidate = 60` for inventory data
- Or split: SSG the page shell, but SSR/dynamic the stock section

### P2 — Add cart freshness re-check at checkout entry points
Two places need a stock freshness check:
1. **Cart Drawer** — when the drawer opens, fire `GET /api/products/stock-check?ids=...` for all cart items, compare with stored `inventoryCount`, mark stale items
2. **Checkout page mount** — on `useEffect` mount, re-verify all cart items. Disable the Pay button and show a warning for any item where DB stock < cart quantity or `is_active = false`

For products in the cart a long time:
- Add a `cartAddedAt` timestamp to each `CartItem`
- If `Date.now() - cartAddedAt > 15 minutes`, treat the stored `inventoryCount` as untrustworthy and force a live DB check before enabling the Checkout button

### P3 — Re-verify `isPreOrder` and `is_active` server-side at initialize
In `paystack/initialize`, add `is_active, preorder_enabled` to the product select query. Replace the client-supplied `item.isPreOrder` trust with server-verified values:
```typescript
const serverPreorder = dbProductMap[item.productId]?.preorder_enabled ?? false;
const serverActive   = dbProductMap[item.productId]?.is_active ?? true;
if (!serverActive && !serverPreorder) { /* treat as unavailable */ }
if (serverPreorder) continue; // server-verified bypass
```

### P4 — Deduplicate `normAttr` into a shared utility
Move the normalisation function to `src/lib/utils/normAttr.ts` and import it in both `paystack/initialize` and `paystack/webhook`. This prevents silent divergence.

### P5 — Collapse the two stock checks into one
Remove the soft OOS check (lines 133–160). The hard block already catches `totalQty > stock`. If the intent is to allow partial orders (skip OOS items rather than abort), that logic should be explicit and documented, not a side effect of two conflicting checks.

### P6 — Add variant changes to `RealtimeStockMonitor`
Add a second subscription on `product_variants` table. When a variant's `inventory_count` drops to 0, emit a toast — same as the existing product-level toast.

---

## Cache Delay Removal Plan

The following specific lines should be changed when removing the cache delay:

| File | Line | Current | Change to |
|---|---|---|---|
| `src/lib/products.ts` | 148 | `{ revalidate: 60 }` | `{ revalidate: 0 }` or remove cache wrapper for inventory fields |
| `src/app/(shop)/products/[slug]/page.tsx` | 60 | `export const revalidate = 60` | `export const dynamic = 'force-dynamic'` or `export const revalidate = 0` |
| `src/lib/products.ts` | 63 | `{ revalidate: 300 }` for categories | Keep — categories don't affect stock availability |
| `src/app/(shop)/products/[slug]/page.tsx` | 29 | `{ revalidate: 300 }` for auto discounts | Can keep — discounts don't affect stock |

The `revalidatePath` calls in the webhook can remain as an additional cache-busting layer, but should not be the primary mechanism.

---

## Checkout Button Verification — Full Scenario Matrix

| Cart Item State | Current Behaviour | Required Behaviour |
|---|---|---|
| Item added < 1 min ago, in stock | Button enabled, count accurate | ✓ OK |
| Item added > 15 min ago, still in stock | Button enabled, count FROZEN at add-time | Re-verify on checkout open |
| Item added > 15 min ago, now OOS | Button enabled, no warning | Button disabled or "Verify" step required |
| Item's product deactivated (`is_active=false`) | No warning; passes checkout if `inventory_count > 0` | Show "Item no longer available"; block checkout |
| Item's `preorder_enabled` toggled off after add | `isPreOrder: true` in cart bypasses all stock checks | Re-verify `preorder_enabled` server-side |
| Item's variant sold out (variant tracking) | `inventoryCount` in cart reflects add-time value | Re-verify variant stock server-side on checkout |
| All items OOS | 409 response from initialize | Same — but warn BEFORE user fills form |
| Some items OOS, some in-stock | Charges for all; OOS noted in `oosItems` on success page | Warn before checkout; offer to remove OOS items |
