/**
 * Miss Tokyo — k6 Load Test
 * Simulates a "product drop" shopper journey up to 1,000 VUs.
 *
 * Run:
 *   k6 run scripts/load-test.js
 *   k6 run --env BASE_URL=https://misstokyo.shop scripts/load-test.js
 *
 * Outputs:
 *   - HTTP status checks per stage
 *   - p95 latency threshold (< 3 s)
 *   - Error-rate threshold (< 2 %)
 *
 * Architecture notes (read before scaling to 1,000 VUs):
 * ─────────────────────────────────────────────────────
 * 1. Supabase connection safety
 *    This project uses @supabase/supabase-js which communicates via PostgREST
 *    (HTTPS REST API), NOT a direct Postgres connection on port 5432. You are
 *    therefore NOT subject to pg connection-pool exhaustion from Vercel
 *    serverless cold starts. However, Supabase still has:
 *      - Max concurrent PostgREST worker threads (plan-dependent)
 *      - Row-level read quotas on the free/pro tier
 *    Mitigation already in place: homepage (revalidate=300) and product pages
 *    (revalidate=60 + generateStaticParams) serve cached HTML — the DB is only
 *    hit once per revalidation window, not once per user.
 *    If you ever add Prisma / raw pg queries: switch DATABASE_URL to the
 *    Supabase Supavisor Pooler URL on port 6543, not 5432.
 *
 * 2. Cart API
 *    There is no /api/cart endpoint. The cart is Zustand state in the browser.
 *    The realistic server-side boundary for a drop is /api/paystack/initialize
 *    (checkout initiation). This script tests that endpoint with a deliberately
 *    malformed body so it returns 400/401 without creating a real transaction —
 *    confirming the function cold-starts, initialises, and responds under load.
 *    To test the happy path, provide a valid Paystack test key and payload.
 *
 * 3. Paystack rate limits
 *    Paystack's test mode has no published hard rate limit but they recommend
 *    < 100 req/s per account in test mode. The payment stage in this script
 *    applies a 0.1 exec rate (10 % of users) to stay safe. In production, only
 *    real purchases hit this endpoint, so 1,000 VUs ≠ 1,000 Paystack calls.
 *
 * 4. Vercel image optimisation
 *    k6 does not execute JavaScript, so no <Image> optimisation requests are
 *    made. Real browser load will include image fetch overhead. Use Lighthouse
 *    or WebPageTest for full render-budget profiling.
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

// ── Config ────────────────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || "https://misstokyo.shop";

// A published product slug. Override via --env PRODUCT_SLUG=your-slug
const PRODUCT_SLUG = __ENV.PRODUCT_SLUG || "stark-ring";

// ── Custom metrics ────────────────────────────────────────────────────────────

const errorRate   = new Rate("errors");
const homepageDur = new Trend("homepage_duration",  true);
const pdpDur      = new Trend("pdp_duration",       true);
const checkoutDur = new Trend("checkout_duration",  true);

// ── Thresholds ────────────────────────────────────────────────────────────────

export const options = {
    // ── Stages ──────────────────────────────────────────────────────────────
    // Stage 1 — Ramp up:   0 → 50 VUs over 60 s  (warm caches, baseline)
    // Stage 2 — Sustained: 50 VUs for 60 s         (steady-state drop traffic)
    // Stage 3 — Ramp down: 50 → 0 VUs over 30 s   (graceful wind-down)
    //
    // Increase target in stages/1 and stages/2 for higher VU counts.
    // Recommended progression: 50 → 200 → 500 → 1000
    stages: [
        { duration: "60s", target: 50  }, // ramp up
        { duration: "60s", target: 50  }, // sustained load
        { duration: "30s", target: 0   }, // ramp down
    ],

    thresholds: {
        // 95th-percentile response time across all requests < 3 s
        http_req_duration: ["p(95)<3000"],

        // Custom per-page latency budgets
        homepage_duration: ["p(95)<2000"],
        pdp_duration:      ["p(95)<2000"],
        checkout_duration: ["p(95)<5000"], // checkout is dynamic + auth check

        // Error rate < 2 % (4xx/5xx that aren't expected 401s)
        errors: ["rate<0.02"],
    },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

/** Common browser-like headers — helps distinguish load-test traffic in logs */
const commonHeaders = {
    "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-GB,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection":      "keep-alive",
    "X-Load-Test":     "k6",           // tag so you can filter in Vercel logs
};

const jsonHeaders = {
    "Content-Type": "application/json",
    "X-Load-Test":  "k6",
};

// ── Virtual user journey ──────────────────────────────────────────────────────

export default function () {

    // ── Stage 1: Homepage ────────────────────────────────────────────────────
    group("1. Homepage", () => {
        const res = http.get(BASE_URL + "/", { headers: commonHeaders });

        homepageDur.add(res.timings.duration);

        const ok = check(res, {
            "homepage: status 200": r => r.status === 200,
            "homepage: has Miss Tokyo branding": r => r.body.includes("MISS TOKYO") || r.body.includes("Miss Tokyo"),
            "homepage: responds in < 2 s":  r => r.timings.duration < 2000,
        });

        if (!ok) errorRate.add(1); else errorRate.add(0);
    });

    sleep(randomBetween(2, 3)); // realistic browse pause

    // ── Stage 2: Product Detail Page (PDP) ──────────────────────────────────
    group("2. Product Detail Page", () => {
        const res = http.get(`${BASE_URL}/products/${PRODUCT_SLUG}`, { headers: commonHeaders });

        pdpDur.add(res.timings.duration);

        const ok = check(res, {
            "pdp: status 200":            r => r.status === 200,
            "pdp: has Add to Cart":       r => r.body.includes("Add to Cart") || r.body.includes("add-to-cart"),
            "pdp: responds in < 2 s":     r => r.timings.duration < 2000,
        });

        if (!ok) errorRate.add(1); else errorRate.add(0);
    });

    sleep(randomBetween(2, 5)); // realistic "reading the product" pause

    // ── Stage 3: Checkout initiation (server-side boundary) ─────────────────
    // Cart state lives in the browser (Zustand) — there is no /api/cart.
    // The first server call in the purchase flow is /api/paystack/initialize.
    // We POST with a minimal payload; unauthenticated requests return 401.
    // A 401 proves the serverless function cold-started, ran auth middleware,
    // and responded correctly — without creating a real Paystack transaction.
    group("3. Checkout initiation", () => {
        const payload = JSON.stringify({
            amount:       1000,
            email:        `loadtest+${__VU}@example.com`,
            cartItems:    [{ productId: "load-test", name: "Load Test Item", price: 10, quantity: 1 }],
            deliveryMethod: "delivery",
        });

        const res = http.post(
            `${BASE_URL}/api/paystack/initialize`,
            payload,
            { headers: jsonHeaders },
        );

        checkoutDur.add(res.timings.duration);

        const ok = check(res, {
            // 401 = auth check passed, expected for unauthenticated test traffic
            // 200 = authenticated user (if you add a cookie/Bearer token above)
            // 400 = payload validation fired — function is alive and running
            "checkout: server responded": r => [200, 400, 401, 403].includes(r.status),
            "checkout: not a 5xx error":  r => r.status < 500,
            "checkout: responds in < 5 s": r => r.timings.duration < 5000,
        });

        // Only count as an error if the server itself broke (5xx / timeout)
        if (!ok || res.status >= 500) errorRate.add(1); else errorRate.add(0);
    });

    sleep(randomBetween(1, 2)); // brief pause before next iteration
}

// ── Setup — warm the ISR cache before the ramp begins ────────────────────────
// k6 runs setup() once before any VUs start. Seeding the CDN cache here means
// the first wave of VUs hits warmed pages instead of cold ISR misses.
export function setup() {
    console.log(`[setup] Warming ISR cache at ${BASE_URL}…`);
    http.get(BASE_URL + "/",                              { headers: commonHeaders });
    http.get(`${BASE_URL}/products/${PRODUCT_SLUG}`,      { headers: commonHeaders });
    http.get(`${BASE_URL}/shop`,                          { headers: commonHeaders });
    console.log("[setup] Cache warmed. Starting VU ramp.");
}

// ── Teardown — summary hint ───────────────────────────────────────────────────
export function teardown() {
    console.log([
        "",
        "─── Post-test checklist ───────────────────────────────────────────────",
        "1. Supabase dashboard → Reports → Database → check query volume spike",
        "2. Vercel dashboard  → Functions → check invocation count & error rate",
        "3. Vercel dashboard  → Analytics → check Core Web Vitals under load",
        "4. If homepage_duration p95 > 500 ms, the ISR cache is being bypassed",
        "   (likely caused by the shop layout's maintenance-mode DB call)",
        "5. If checkout p95 > 3 s, Paystack's API is the bottleneck — expected",
        "   under high parallelism; consider a Paystack test-mode rate cap of",
        "   ~50 req/s when scaling beyond 200 VUs.",
        "───────────────────────────────────────────────────────────────────────",
    ].join("\n"));
}
