# Miss Tokyo — Open Remediation Backlog
**Generated:** 2026-03-22 | **Branch:** `feat/shoppable-gallery`
**Status:** 28 of 74 audit items fixed. 46 remain.

---

## PRIORITY 1 — Fix Immediately (Security, Medium/Low still open)

These are the 4 remaining unfixed security items.

---

### SEC-13 · MEDIUM · `dangerouslySetInnerHTML` on Footer Social SVG Paths
- **File:** `src/components/ui/miss-tokyo/Footer.tsx:186`
- **Risk:** Currently hardcoded (safe now), but if social icon paths are ever made DB-configurable this becomes stored XSS on every page.
- **Fix:** Replace `dangerouslySetInnerHTML={{ __html: s.path }}` with a static map of React SVG components keyed by platform name. Remove the `path` string from the `socialLinks` array entirely.

---

### SEC-17 · MEDIUM · Invoice Paystack-Link Trusts Client-Supplied Amount
- **File:** `src/app/api/invoice/paystack-link/route.ts:15`
- **Risk:** `amount` taken from request body. A caller with admin credentials can create a Paystack payment page for any arbitrary amount — misuse risk for internal fraud.
- **Fix:** Accept `invoiceId` in the request body. Fetch the invoice from DB (`supabaseAdmin.from("invoices").select("total_amount").eq("id", invoiceId).single()`). Use that amount for the Paystack initialisation.

---

### SEC-18 · MEDIUM · HTML Injection in Order Confirmation Emails
- **File:** `src/app/api/paystack/webhook/route.ts:163`
- **Risk:** `item.name`, `item.size`, `item.color` from Paystack metadata are interpolated into HTML email strings without encoding. If a product name contains `<script>` or `<img onerror=...>` it will execute in email clients that render HTML.
- **Fix:** Add a small `escHtml` helper and wrap all user-supplied values before string interpolation:
  ```ts
  const escHtml = (s: string) =>
    s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  ```
  Apply to every `item.name`, `item.size`, `item.color`, `fullName`, `address` used inside HTML template strings.

---

### SEC-20 · LOW · Unvalidated `orderIds` Array in Dispatch / Pickup Endpoints
- **Files:** `src/app/api/dispatch/route.ts:22`, `src/app/api/pickup-ready/route.ts:23`
- **Risk:** No max-length or UUID format validation. A malicious authenticated caller (sales_staff) can submit 10 000 IDs and cause a full-table Supabase query.
- **Fix:**
  ```ts
  if (!Array.isArray(orderIds) || orderIds.length > 100) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (orderIds.some(id => !UUID.test(id))) return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
  ```

---

### SEC-21 · LOW · Legacy `miss_tokyo_session` Cookie Auth System
- **File:** `src/app/api/auth/login/route.ts`
- **Risk:** Parallel auth system using a static `AUTH_SECRET` cookie value that never rotates. No active consumers found in the codebase.
- **Fix:** Delete `src/app/api/auth/login/route.ts` entirely. Verify no frontend code calls `/api/auth/login` before deleting.

---

## PRIORITY 2 — Performance (High Impact, Fix This Sprint)

These are the items with the biggest real-world user impact.

---

### PERF-02 · HIGH · 4–5 Sequential Supabase Round-Trips in `getProducts()`
- **File:** `src/lib/products.ts:57`
- **Impact:** Every shop page load waits for queries to run in series: category resolve → main products → price bounds → category name map.
- **Fix:**
  1. Run price bounds and main products query in `Promise.all`.
  2. Cache the full `categories` table with `unstable_cache` (60 s TTL) — eliminates the per-request category resolve.
  3. Pass resolved `categoryId` from the page into `getProducts` so the internal resolve is skipped.

---

### PERF-04 · HIGH · Price Bounds Fetches Entire Products Table Into Memory
- **File:** `src/lib/products.ts:107`
- **Impact:** Every `getProducts` call loads every `price_ghs` value for all active products into Node memory and computes min/max in JS. Scales linearly with catalogue size.
- **Fix:** Replace with two parallel `.limit(1)` queries:
  ```ts
  const [{ data: minRow }, { data: maxRow }] = await Promise.all([
    db.from("products").select("price_ghs").eq("is_active", true).order("price_ghs", { ascending: true }).limit(1),
    db.from("products").select("price_ghs").eq("is_active", true).order("price_ghs", { ascending: false }).limit(1),
  ]);
  ```

---

### PERF-07 · HIGH · Metrics Aggregated in JavaScript Over Full Orders Table
- **File:** `src/lib/utils/metrics.ts:74,128`
- **Impact:** `fetchOrderStats` and `fetchSalesByCategory` fetch every order row then count/sum in JS. Degrades linearly as orders grow. Will become a serious problem at scale.
- **Fix:** Move aggregations to Postgres via Supabase RPC functions:
  ```sql
  -- Example RPC
  create function get_order_stats() returns json as $$
    select json_build_object(
      'total_revenue', sum(total_amount),
      'order_count', count(*)
    ) from orders where status = 'paid';
  $$ language sql stable;
  ```

---

### PERF-18 · HIGH · Cart Components Subscribe to Entire Zustand Store
- **Files:** `src/components/ui/miss-tokyo/CartButton.tsx:8`, `CartDrawer.tsx:10`
- **Impact:** Any state change anywhere in the cart store (e.g. `isOpen` toggle) re-renders both components even if the data they care about hasn't changed.
- **Fix:** Use granular selectors:
  ```ts
  // CartButton — only needs item count
  const totalItems = useCart(s => s.totalItems());
  // CartDrawer — only needs items array and setIsOpen
  const items = useCart(s => s.items);
  const setIsOpen = useCart(s => s.setIsOpen);
  ```

---

### PERF-03 · HIGH · Full `categories` Table Fetched on Every PDP Load
- **File:** `src/lib/products.ts:205`
- **Impact:** `getProductBySlug` fetches all categories just to resolve one `category_type → slug` mapping. Unnecessary round-trip on every product page.
- **Fix:** Cache categories at module level using React's `cache()` or `unstable_cache`:
  ```ts
  import { unstable_cache } from "next/cache";
  const getCachedCategories = unstable_cache(
    () => db.from("categories").select("name, slug"),
    ["categories"],
    { revalidate: 60 }
  );
  ```

---

### PERF-23 + LOG-17 · HIGH · `getProductBySlug` Called Twice Per PDP
- **File:** `src/app/(shop)/products/[slug]/page.tsx:29,47`
- **Impact:** `generateMetadata` and the page component both call `getProductBySlug` independently. Two identical DB queries per PDP render.
- **Fix:**
  ```ts
  import { cache } from "react";
  export const getProductBySlugCached = cache(getProductBySlug);
  ```
  Use `getProductBySlugCached` in both `generateMetadata` and the page. React deduplicates within a single render cycle.

---

### PERF-20 + SPD-09 · HIGH · `NewArrivalsSection` Is Client-Only with CLS Skeleton
- **File:** `src/components/public/NewArrivalsSection.tsx`
- **Impact:** Entire section fetches from browser after hydration. Users see a skeleton that causes layout shift, then products pop in. Homepage already has `revalidate = 60`.
- **Fix:** Convert to an `async` server component. Fetch in the homepage `Promise.all` alongside other data and pass as props. Remove client-side fetch entirely.

---

### PERF-11 · HIGH · `QuickViewModal` Does `select("*")` on Every Open
- **File:** `src/components/ui/miss-tokyo/QuickViewModal.tsx:13`
- **Impact:** Every quick-view interaction triggers a fresh DB round-trip. The full product object is already in `ShopPageClient` state.
- **Fix:** Accept the product object as a prop (`product: ShopProduct`) instead of `slug`. Remove the internal `useEffect` fetch. Pass the object directly from the `ShopProductCard` click handler.

---

### PERF-13 + PERF-14 · HIGH · Missing Cache-Control Headers on API Routes
- **Files:** `src/app/api/products/route.ts`, `src/app/api/me/route.ts`, `src/app/api/paystack/verify/route.ts`
- **Impact:** CDN/browser may cache sensitive responses or fail to cache public ones.
- **Fix:**
  ```ts
  // Public product API
  response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  // Auth / sensitive routes
  response.headers.set("Cache-Control", "private, no-store");
  ```

---

## PRIORITY 3 — Performance (Medium Impact)

---

### PERF-05 · MEDIUM · `getVideoProducts` Filters Entire Catalogue in JS
- **File:** `src/lib/products.ts:296`
- **Fix:** Add a DB-level filter. Store `video_url` as a separate column or filter `image_urls` using Postgres `array_to_string`:
  ```ts
  // Interim: at minimum add a limit
  .limit(50)
  ```
  Long-term: add a `has_video` boolean column, index it, and filter on it.

---

### PERF-08 · MEDIUM · `getProductReviews` Has No Limit
- **File:** `src/lib/products.ts:256`
- **Fix:** Add `.limit(50)` and fetch distribution via `GROUP BY rating` aggregation rather than computing in JS.

---

### PERF-15 + PERF-16 · MEDIUM · `validateCode` Hits DB Every Call, Sequentially
- **File:** `src/app/api/checkout/validate-code/route.ts`
- **Fix:**
  1. Wrap coupon and gift card lookups in `Promise.all` (removes one sequential wait).
  2. Wrap the whole handler in `unstable_cache` with a 30 s TTL keyed on `[normalized]`.

---

### PERF-19 · MEDIUM · `totalItems`/`totalAmount` as Store Methods
- **File:** `src/store/useCart.ts:74`
- **Impact:** Calling `s.totalItems()` inside a Zustand selector bypasses memoisation — the component always re-renders on any store mutation.
- **Fix:** Replace the method call pattern with `useMemo` inside the component:
  ```ts
  const items = useCart(s => s.items);
  const totalItems = useMemo(() => items.reduce((n, i) => n + i.quantity, 0), [items]);
  ```

---

### PERF-21 · MEDIUM · `<Suspense fallback={null}>` on Shop Page
- **File:** `src/app/(shop)/shop/page.tsx`
- **Impact:** Users see a blank page while the shop loads instead of a meaningful skeleton.
- **Fix:** Replace `fallback={null}` with a skeleton grid component matching the 2-column mobile / 3-column tablet / 4-column desktop layout.

---

### PERF-22 · MEDIUM · `categories` Table Queried 2–3× Per Shop Page Request
- **File:** `src/app/(shop)/shop/page.tsx`
- **Fix:** Resolve category once at the top of the page server component and pass `{ categoryId, categoryName }` into `getProducts`. Use `unstable_cache` on the categories fetch.

---

## PRIORITY 4 — Speed / Web Vitals (Open)

---

### SPD-02 · HIGH · Hero Slider Is Client-Only — LCP Image Never Preloaded
- **File:** `src/components/public/HeroSlider.tsx`
- **Impact:** The hero image never appears in SSR HTML. `<link rel="preload">` is never emitted. LCP measured from client JS execution, not document parse.
- **Fix:** Extract the first slide `<Image>` into a server-rendered wrapper with `priority={true}`. Keep the slide transition logic in a `"use client"` wrapper that activates after the first frame.

---

### SPD-03 · HIGH · CategoryGrid Above-Fold Images Missing `priority`
- **File:** `src/components/public/CategoryGrid.tsx:56`
- **Fix:** Add `priority={index < 2}` to the first two `<Image>` elements.

---

### SPD-04 · HIGH · `/shop` Is `force-dynamic` with 9+ Round-Trips
- **File:** `src/app/(shop)/shop/page.tsx:9`
- **Impact:** Auth check + profile + site settings + `getProducts` (4 sub-queries) + categories = ~9 sequential/parallel queries before first byte. Every visit re-runs everything.
- **Fix:** Remove `force-dynamic`. Add `export const revalidate = 60`. Move the auth/wholesale gate to a client-side check that augments the already-rendered public shell.

---

### SPD-05 · MEDIUM · Root Layout `generateMetadata` Blocks on Uncached DB Query
- **File:** `src/app/layout.tsx:26`
- **Fix:**
  ```ts
  import { unstable_cache } from "next/cache";
  const getSiteMetadata = unstable_cache(
    () => supabase.from("site_metadata").select("*").single(),
    ["site-metadata"],
    { revalidate: 3600 }
  );
  ```

---

### SPD-07 · MEDIUM · `framer-motion` in NavBar (~40 kB on Every Page)
- **File:** `src/components/ui/miss-tokyo/NavBar.tsx:7`
- **Fix:** Replace the search modal animation with Tailwind's `animate-in fade-in slide-in-from-top-2 duration-200` classes — already used elsewhere in the codebase. Remove the `framer-motion` import from NavBar entirely.

---

### SPD-08 · MEDIUM · NavBar Auth Fetch Causes Flash of Wrong Content
- **File:** `src/components/ui/miss-tokyo/NavBar.tsx:43`
- **Impact:** Nav renders "Log In" then flips to "Account" after hydration. Two Supabase round-trips on every page mount.
- **Fix:** Pass `initialUser` from the server layout as a prop. NavBar reads the prop for first render; Supabase client only used for session refresh events.

---

### SPD-12 · LOW-MEDIUM · Missing `poweredByHeader: false` in `next.config.ts`
- **File:** `next.config.ts`
- **Fix:** Add `poweredByHeader: false` to the config object. (Security headers are already set via `proxy.ts`.)

---

## PRIORITY 5 — Logic / Dead Code (Open)

---

### LOG-05 · MEDIUM · `loadMore` Closure Captures Stale `products.length`
- **File:** `src/components/ui/miss-tokyo/ShopPageClient.tsx`
- **Fix:** Derive the next page offset inside the `setProducts` functional updater:
  ```ts
  setProducts(prev => {
    const merged = [...prev, ...newProducts];
    setHasMore(merged.length < newTotal);
    return merged;
  });
  ```

---

### LOG-06 · LOW · Price Debounce Timer Leaks on Unmount
- **File:** `src/components/ui/miss-tokyo/ShopPageClient.tsx`
- **Fix:**
  ```ts
  const priceDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (priceDebounce.current) clearTimeout(priceDebounce.current); }, []);
  ```

---

### LOG-07 · HIGH · `getProductBySlug` Swallows DB Errors → False 404
- **File:** `src/lib/products.ts:189`
- **Impact:** A transient Supabase error returns `null`, which triggers `notFound()`. Customers see a 404 page when the product exists.
- **Fix:**
  ```ts
  const { data, error } = await db.from("products")...
  if (error) { console.error("[getProductBySlug]", error); throw error; }
  if (!data) return null;
  ```

---

### LOG-08 · MEDIUM · `getRelatedProducts`, `getProductReviews`, `getCategories` Discard Errors
- **File:** `src/lib/products.ts:225,252,136`
- **Fix:** Destructure `error` and add `console.error` logging in all three functions. Prevents silent failures from being invisible in production logs.

---

### LOG-09 · MEDIUM · Paystack HTTP Response Not Checked Before `.json()`
- **File:** `src/app/api/paystack/initialize/route.ts`
- **Fix:**
  ```ts
  const response = await fetch("https://api.paystack.co/...", { ... });
  if (!response.ok) {
    const text = await response.text();
    console.error("[Paystack] Non-2xx:", response.status, text);
    return NextResponse.json({ error: "Payment provider error" }, { status: 502 });
  }
  const data = await response.json();
  ```

---

### LOG-13 · LOW · `inStock` Parameter Declared but Never Applied
- **File:** `src/lib/products.ts:45`
- **Fix:** Either implement the filter: `if (inStock) query = query.gt("inventory_count", 0);` or remove the parameter from `GetProductsParams`.

---

### LOG-15 · MEDIUM · `ShopPageClient` Effect Omits Meaningful Dependencies
- **File:** `src/components/ui/miss-tokyo/ShopPageClient.tsx`
- **Fix:** Add `initialProducts`, `total`, `minPrice`, `maxPrice` to the `useEffect` dependency array, or stabilise them with `useRef` if intentionally excluded.

---

## Summary Table

| Priority | Area | Count | Notes |
|----------|------|-------|-------|
| P1 | Security (remaining) | 4 | SEC-13, SEC-17, SEC-18, SEC-20/21 |
| P2 | Performance — High Impact | 9 | PERF-02/03/04/07/11/18/20/23, cache headers |
| P3 | Performance — Medium Impact | 5 | PERF-05/08/15/19/21/22 |
| P4 | Speed / Web Vitals | 7 | SPD-02/03/04/05/07/08/12 |
| P5 | Logic / Dead Code | 8 | LOG-05/06/07/08/09/13/15 + type cleanup |
| — | Performance (skip/deferred) | 3 | PERF-06/10/12 (admin pages, lower urgency) |

**Recommended sprint order:**
1. SEC-18 (email HTML injection — small helper, big risk reduction)
2. PERF-04 (price bounds query — 2-line fix, instant memory win)
3. PERF-23 + LOG-17 (cache `getProductBySlug` with `cache()` — 3 lines)
4. PERF-03 (cache categories with `unstable_cache` — used everywhere)
5. PERF-02 (parallelize `getProducts` queries — biggest TTFB win)
6. SPD-03 (add `priority` to CategoryGrid — 1 line)
7. SPD-12 (`poweredByHeader: false` — 1 line)
8. LOG-07 (stop false 404s — 2 lines)
9. PERF-18 (Zustand selectors in cart components)
10. SPD-07 (remove framer-motion from NavBar — bundle reduction)
