# Inventory Hardening — Manual Test Checklist

## Prerequisites

- Dev server running (`npm run dev`)
- At least 2 active products with known inventory counts in Supabase
- A Paystack test key configured in `.env.local`
- `CRON_SECRET` set in `.env.local`
- Admin access to the store dashboard

---

## 1. CartDrawer — Live Stock Re-Check

### 1a. First open (no stale items)

- [ ] Add a product to cart
- [ ] Open the CartDrawer
- [ ] Open Network tab in DevTools — confirm **no** request to `/api/inventory/check` fires (item is fresh, `cartAddedAt` is < 15 min ago and no 5-min window has expired)

### 1b. Stale item triggers re-check

- [ ] Open browser console and run:
  ```js
  const key = 'miss-tokyo-cart-storage';
  const store = JSON.parse(localStorage.getItem(key));
  store.state.items[0].cartAddedAt = Date.now() - 16 * 60 * 1000; // 16 min ago
  localStorage.setItem(key, JSON.stringify(store));
  ```
- [ ] Close and re-open CartDrawer
- [ ] Confirm a request to `/api/inventory/check` fires in Network tab
- [ ] If stock is fine: no amber warning shown on item
- [ ] Manually mark a product OOS in Supabase (`inventory_count = 0`, `preorder_enabled = false`), repeat — confirm amber warning **"May no longer be available — will be verified at checkout"** appears on that item

### 1c. 5-minute cache window

- [ ] Open CartDrawer (triggers re-check if stale)
- [ ] Close and immediately re-open CartDrawer — confirm **no** second request fires (cache still valid)

---

## 2. Checkout Page — Mount-Time Stock Gate

### 2a. Clean cart

- [ ] Add in-stock items to cart, navigate to `/checkout`
- [ ] Pay button shows **"Checking availability..."** and is disabled briefly on mount
- [ ] Pay button becomes active with label **"Pay GHS X.XX"** once check completes
- [ ] No error message shown

### 2b. OOS item blocks Pay

- [ ] Mark a product OOS in Supabase (`inventory_count = 0`, `preorder_enabled = false`)
- [ ] Add it to cart (inject via localStorage if the UI blocks add-to-bag)
- [ ] Navigate to `/checkout`
- [ ] Confirm Pay button stays **disabled** after check
- [ ] Confirm error message names the unavailable product

### 2c. Undersupplied item blocks Pay

- [ ] Set `inventory_count = 1` for a product in Supabase
- [ ] Inject quantity 3 of that product into the cart via localStorage
- [ ] Navigate to `/checkout`
- [ ] Confirm error message reads **"only has 1 unit left"**

### 2d. Inactive product blocks Pay

- [ ] Set `is_active = false` for a product in Supabase
- [ ] Inject it into the cart via localStorage
- [ ] Navigate to `/checkout`
- [ ] Confirm error message reads **"is no longer available"**

### 2e. Pre-order bypasses stock gate

- [ ] Set `preorder_enabled = true` on an OOS product
- [ ] Add it to cart, navigate to `/checkout`
- [ ] Confirm Pay button is **not** blocked by stock error for that item

---

## 3. Atomic Reservation at Payment Initialization

- [ ] Add an in-stock item (qty 2) to cart
- [ ] Go to `/checkout`, fill form, click Pay
- [ ] Before completing payment in Paystack popup, check Supabase `online_reservations` table — confirm a row exists for the order with correct `product_id`, `quantity`, and `expires_at` ~30 min in the future
- [ ] Complete payment — confirm reservation row is **deleted** after webhook fires (consumed by `confirmSale`)
- [ ] Confirm `inventory_count` in the product/variant row has decremented correctly

### 3a. Parallel race prevention

- [ ] Set `inventory_count = 1` for a product
- [ ] Open two browser tabs, add qty 1 to cart in both
- [ ] Click Pay in both as simultaneously as possible
- [ ] Confirm only **one** order succeeds; the other gets a payment initialization error (reservation call fails)

---

## 4. Verify→Webhook Race Fix

- [ ] Place an order and complete Paystack payment
- [ ] In Supabase `orders` table: confirm `payment_status` changes to `"paid"` and `status` changes to `"paid"` — both set **by the webhook**, not the verify call
- [ ] Check `orders` table immediately after the Paystack redirect (before webhook fires) — `status` should still be `"pending"`; only `payment_status` advances via webhook

---

## 5. Webhook Idempotency

- [ ] Find a completed order's `reference` in Supabase
- [ ] Send a duplicate webhook payload to `/api/paystack/webhook` via curl:
  ```bash
  curl -X POST http://localhost:3000/api/paystack/webhook \
    -H "Content-Type: application/json" \
    -H "x-paystack-signature: <valid-hmac>" \
    -d '{"event":"charge.success","data":{"reference":"<reference>"}}'
  ```
- [ ] Confirm inventory is **not** decremented a second time (check `inventory_count` before and after)
- [ ] Confirm response is 200 (idempotent, not an error)

---

## 6. Admin Variant Save — Inventory Preserved

- [ ] Find a product with variants. Note the current `inventory_count` for each variant in Supabase
- [ ] Go to `/catalog/products/[id]/edit`, make a non-inventory change (e.g., update the description or price)
- [ ] Save the product
- [ ] Confirm `inventory_count` on all variants is **unchanged** in Supabase

### 6a. Adding a new variant

- [ ] Add a new size/color variant in the edit form, save
- [ ] Confirm existing variants keep their `inventory_count`
- [ ] Confirm the new variant appears with `inventory_count = 0` (or whatever default you set)

### 6b. Removing a variant

- [ ] Delete one variant from the edit form, save
- [ ] Confirm that variant row is gone from Supabase
- [ ] Confirm remaining variants keep their `inventory_count`

---

## 7. Cron — Expire Reservations

- [ ] Create a reservation manually in Supabase `online_reservations` with `expires_at` in the past (e.g., `NOW() - INTERVAL '1 minute'`) and `status = 'pending'` in the linked `orders` row
- [ ] Trigger the cron endpoint:
  ```bash
  curl -X GET "http://localhost:3000/api/cron/expire-reservations" \
    -H "Authorization: Bearer $CRON_SECRET"
  ```
- [ ] Confirm the linked `orders` row now has `status = 'expired'`
- [ ] Confirm the `online_reservations` row **still exists** (not deleted — needed for late webhooks)

### 7a. Late webhook still resolves after expiry

- [ ] Expire a reservation as above
- [ ] Send the `charge.success` webhook for that order's reference
- [ ] Confirm `confirmSale` still decrements inventory (reservation row found, late-webhook path)
- [ ] Confirm reservation row is deleted after webhook processes

### 7b. Cron rejects missing/wrong secret

- [ ] Call the endpoint without the `Authorization` header — expect 401
- [ ] Call with wrong secret — expect 401

---

## 8. Legacy Route Deleted

- [ ] Confirm `GET /api/verify-payment` returns 404:
  ```bash
  curl -i "http://localhost:3000/api/verify-payment?order_id=fake&email=x@x.com"
  ```

---

## 9. Product Cache Invalidation

- [ ] Load a product page — note the current price/stock shown
- [ ] Update the product price in Supabase directly (or via admin)
- [ ] Complete a payment for any order (triggers `revalidateTag("products")` in webhook)
- [ ] Hard-refresh the product page — confirm updated price/stock is shown without waiting 60 seconds

---

## 10. `/api/inventory/check` Endpoint

- [ ] Make a direct GET request:
  ```bash
  curl "http://localhost:3000/api/inventory/check?items=%5B%7B%22productId%22%3A%22<id>%22%2C%22variantId%22%3Anull%2C%22size%22%3A%22M%22%2C%22color%22%3Anull%2C%22stitching%22%3Anull%2C%22quantity%22%3A1%7D%5D"
  ```
- [ ] Confirm response has `{ results: [{ productId, available, isActive, preorderEnabled }] }`
- [ ] Confirm `Cache-Control: private, no-store` header is present
- [ ] Confirm with a product that has 0 stock: `available` is 0, `isActive` matches DB

---

## 11. Pre-Order Flow (Regression)

- [ ] Enable `preorder_enabled = true` on an OOS product
- [ ] Confirm **Pre-Order** button appears on the PDP instead of OOS message
- [ ] Add to cart — confirm `isPreOrder: true` on the cart item in localStorage
- [ ] Checkout: Pay button not blocked by stock gate
- [ ] Complete payment — confirm `has_preorder = true` on the order in Supabase
- [ ] Confirm pre-order confirmation email is sent (check inbox or Resend logs)
- [ ] Check `/sales/pre-orders` admin page — confirm order appears

---

## 12. Smoke Test — Full Order Flow

- [ ] Add 2 different in-stock products to cart
- [ ] Open CartDrawer — prices and quantities correct
- [ ] Proceed to checkout — form auto-fills if logged in
- [ ] Pay button active, no stock errors
- [ ] Complete payment with Paystack test card (`4084084084084081`, any future date, any CVV)
- [ ] Redirect to `/checkout/success`
- [ ] Confirm in Supabase: `orders.status = "paid"`, `orders.payment_status = "paid"`
- [ ] Confirm `inventory_count` decremented for both products
- [ ] Confirm `online_reservations` row deleted
- [ ] Confirm order confirmation email received
