/**
 * Miss Tokyo — k6 Load Test
 * Simulates a "product drop" shopper journey up to 1,000 VUs.
 *
 * Run:
 *   k6 run scripts/load-test.js
 *   k6 run --env BASE_URL=https://misstokyo.shop scripts/load-test.js
 *   k6 run --env BASE_URL=https://misstokyo.shop --env PRODUCT_SLUG=your-slug scripts/load-test.js
 *
 * DEBUG — diagnose redirect / status issues before a full run:
 *   k6 run --env BASE_URL=https://misstokyo.shop --env DEBUG=true --vus 1 --iterations 1 scripts/load-test.js
 *
 * Scaling progression (always confirm p95 < 500ms before stepping up):
 *   50 → 200 → 500 → 1000 VUs
 *
 * ─── Why http_req_failed was 100% on the first run ────────────────────────────
 * k6 marks ANY request with final status >= 400 as failed. The most common
 * causes on Vercel-hosted Next.js sites:
 *
 *   1. Domain redirect (bare → www, or http → https) — k6 follows redirects
 *      by default up to 10 hops, but if a hop itself returns 4xx the chain
 *      stops. Fix: run DEBUG=true to log exact status + URL at each step.
 *
 *   2. Vercel edge rate-limiting — 50 concurrent VUs from one IP can trigger
 *      Vercel's DDoS protection (429). Fix: spread load across k6 Cloud, or
 *      add your CI runner IP to Vercel's allowlist. A 429 from the edge does
 *      NOT appear in Vercel's Function Error Rate graph (it's pre-function).
 *
 *   3. Middleware auth latency — proxy.ts calls supabase.auth.getUser() on
 *      every request (including public pages). For unauthenticated k6 traffic
 *      this adds a Supabase round-trip per request. Not a status issue but
 *      adds ~20-80ms overhead on every page render.
 *
 * The script now uses setResponseCallback to declare what status codes are
 * "expected" — 200 for pages, [200,400,401,403] for checkout — so the
 * http_req_failed metric is accurate rather than counting expected 401s.
 *
 * ─── Architecture notes ────────────────────────────────────────────────────
 * • Supabase: JS client uses PostgREST (HTTPS, not port 5432). No connection
 *   pool exhaustion from serverless cold starts. Safe to scale to 1,000 VUs.
 *
 * • Cart: client-side Zustand store — no /api/cart endpoint exists. The first
 *   server boundary in the purchase flow is /api/paystack/initialize.
 *
 * • Paystack: keep checkout stage at executionSegmentSequence 10% of VUs or
 *   add a sleep(randomBetween(10,30)) before it. Their test-mode limit is
 *   approximately 50 req/s per account.
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

// ── Config ────────────────────────────────────────────────────────────────────

const BASE_URL     = (__ENV.BASE_URL     || "https://misstokyo.shop").replace(/\/$/, "");
const PRODUCT_SLUG = __ENV.PRODUCT_SLUG || null; // null = auto-discover from /api/products in setup()
const DEBUG        = __ENV.DEBUG === "true";

// ── Custom metrics ────────────────────────────────────────────────────────────

const errorRate   = new Rate("errors");
const homepageDur = new Trend("homepage_duration",  true);
const pdpDur      = new Trend("pdp_duration",       true);
const checkoutDur = new Trend("checkout_duration",  true);

// ── Tell k6 which status codes are NOT failures ───────────────────────────────
// Without this, every 401 (expected from unauthenticated checkout) and every
// 3xx redirect counts as http_req_failed, giving misleading 100% failure rates.
http.setResponseCallback(
    http.expectedStatuses(
        { min: 200, max: 299 }, // success
        301, 302, 303, 307, 308, // redirects (followed automatically)
        401, 403,                // expected for unauthenticated checkout
    )
);

// ── Options ───────────────────────────────────────────────────────────────────

export const options = {
    stages: [
        { duration: "60s", target: 50  }, // ramp up — 0 → 50 VUs
        { duration: "60s", target: 50  }, // sustained load
        { duration: "30s", target: 0   }, // ramp down
        // To scale up, replace lines above with e.g.:
        // { duration: "2m",  target: 200 },
        // { duration: "2m",  target: 200 },
        // { duration: "1m",  target: 0   },
    ],

    thresholds: {
        http_req_duration:  ["p(95)<3000"],
        homepage_duration:  ["p(95)<2000"],
        pdp_duration:       ["p(95)<2000"],
        checkout_duration:  ["p(95)<5000"],
        // After applying setResponseCallback, this should be < 1% for healthy runs.
        // A persistent > 5% signals real server errors or Vercel edge rate-limiting.
        errors:             ["rate<0.02"],
    },
};

// ── Shared headers ────────────────────────────────────────────────────────────

const pageParams = {
    headers: {
        "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control":   "no-cache",   // bypass local k6 cache, hit Vercel CDN
        "X-Load-Test":     "k6",         // tag for filtering in Vercel logs
    },
    // k6 follows redirects by default (maxRedirects=10). Setting explicitly:
    redirects: 10,
};

const jsonParams = {
    headers: {
        "Content-Type": "application/json",
        "Accept":       "application/json",
        "X-Load-Test":  "k6",
    },
    redirects: 10,
};

function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

// ── Diagnostic helper — logs actual status + URL on failure ──────────────────
function diagnose(label, res) {
    if (DEBUG || res.status >= 400) {
        console.log(
            `[${label}] status=${res.status} url=${res.url} ` +
            `duration=${Math.round(res.timings.duration)}ms`
        );
    }
}

// ── Virtual user journey ──────────────────────────────────────────────────────

export default function (data) {
    const productSlug = (data && data.productSlug) || "stark-ring";

    // ── Stage 1: Homepage ────────────────────────────────────────────────────
    group("1. Homepage", () => {
        const res = http.get(BASE_URL + "/", pageParams);
        diagnose("Homepage", res);
        homepageDur.add(res.timings.duration);

        const ok = check(res, {
            "homepage: status 200":            r => r.status === 200,
            "homepage: has Miss Tokyo content": r =>
                r.body.includes("MISS TOKYO") ||
                r.body.includes("Miss Tokyo") ||
                r.body.includes("misstokyo"),
            "homepage: responds in < 2 s":     r => r.timings.duration < 2000,
        });

        errorRate.add(ok ? 0 : 1);
    });

    sleep(randomBetween(2, 3));

    // ── Stage 2: Product Detail Page (PDP) ──────────────────────────────────
    group("2. Product Detail Page", () => {
        const res = http.get(`${BASE_URL}/products/${productSlug}`, pageParams);
        diagnose("PDP", res);
        pdpDur.add(res.timings.duration);

        const ok = check(res, {
            "pdp: status 200":        r => r.status === 200,
            "pdp: has Add to Cart":   r =>
                r.body.includes("Add to Cart") ||
                r.body.includes("add-to-cart") ||
                r.body.includes("Add to Bag"),
            "pdp: responds in < 2 s": r => r.timings.duration < 2000,
        });

        errorRate.add(ok ? 0 : 1);
    });

    sleep(randomBetween(2, 5));

    // ── Stage 3: Checkout initiation ─────────────────────────────────────────
    // Cart is Zustand (client-side) — no /api/cart exists.
    // /api/paystack/initialize is the first server call in the purchase flow.
    // Unauthenticated requests return 401 — expected, confirmed by our checks.
    // This validates the function cold-starts and auth middleware under load
    // without creating real Paystack transactions.
    group("3. Checkout initiation", () => {
        const payload = JSON.stringify({
            amount:         1000,
            email:          `loadtest+vu${__VU}@example.com`,
            cartItems:      [{ productId: "load-test", name: "Load Test Item", price: 10, quantity: 1 }],
            deliveryMethod: "delivery",
        });

        const res = http.post(
            `${BASE_URL}/api/paystack/initialize`,
            payload,
            jsonParams,
        );

        diagnose("Checkout", res);
        checkoutDur.add(res.timings.duration);

        const ok = check(res, {
            // 401 = unauthenticated (expected for k6 traffic)
            // 400 = validation fired — function is running correctly
            // 200 = authenticated (if you add session cookies via k6 scenarios)
            "checkout: server responded":  r => [200, 400, 401, 403].includes(r.status),
            "checkout: not a 5xx error":   r => r.status < 500,
            "checkout: responds in < 5 s": r => r.timings.duration < 5000,
        });

        // Only count as error if the server broke (5xx) or didn't respond
        errorRate.add((!ok || res.status >= 500) ? 1 : 0);
    });

    sleep(randomBetween(1, 2));
}

// ── Setup — discover a real product slug, then warm ISR cache ────────────────
export function setup() {
    console.log(`[setup] Warming ISR cache at ${BASE_URL}…`);

    // ── Step 1: resolve product slug ──────────────────────────────────────────
    // If PRODUCT_SLUG was passed via --env, use it directly.
    // Otherwise fetch the first active product from /api/products so the PDP
    // stage always hits a slug that actually exists in this deployment's DB.
    let productSlug = PRODUCT_SLUG;
    if (!productSlug) {
        const apiRes = http.get(
            `${BASE_URL}/api/products?sort=created_at&page=1`,
            { headers: { "Accept": "application/json" }, redirects: 10 },
        );
        if (apiRes.status === 200) {
            try {
                const body = JSON.parse(apiRes.body);
                const first = body.products && body.products[0];
                if (first && first.slug) {
                    productSlug = first.slug;
                    console.log(`[setup] Auto-discovered product slug: "${productSlug}"`);
                }
            } catch (e) {
                console.warn("[setup] Could not parse /api/products response:", e);
            }
        } else {
            console.warn(`[setup] /api/products returned ${apiRes.status} — falling back to "stark-ring"`);
        }
        if (!productSlug) productSlug = "stark-ring";
    }

    // ── Step 2: warm ISR cache ─────────────────────────────────────────────────
    const warmTargets = [
        BASE_URL + "/",
        `${BASE_URL}/products/${productSlug}`,
        BASE_URL + "/shop",
    ];

    for (const url of warmTargets) {
        const res = http.get(url, pageParams);
        console.log(`[setup] ${url} → ${res.status} (${Math.round(res.timings.duration)}ms)`);

        if (res.status !== 200) {
            console.warn(
                `[setup] ⚠ Expected 200 but got ${res.status} for ${url}.\n` +
                `  Final URL after redirects: ${res.url}\n` +
                `  This will cause homepage/PDP checks to fail during the test.\n` +
                `  Fix: check your BASE_URL or inspect the redirect chain.`
            );
        }
    }

    console.log("[setup] Done. Starting VU ramp.");
    return { productSlug };
}

// ── Teardown ──────────────────────────────────────────────────────────────────
export function teardown(_data) {
    console.log([
        "",
        "─── Interpreting results ─────────────────────────────────────────────",
        "errors > 2%       → Check setup() logs for non-200 status codes.",
        "                    Likely cause: www redirect, Vercel edge rate-limit,",
        "                    or middleware adding latency that breaks cold starts.",
        "homepage p95 > 500ms → ISR cache bypassed. Check middleware for",
        "                    supabase.auth.getUser() on public routes (adds",
        "                    20-80ms of Supabase round-trip per request).",
        "/shop CPU > 1s    → Settings cache working — should drop from 2.08s",
        "                    to < 200ms on cache hits after this deployment.",
        "checkout > 5s     → Paystack API bottleneck. Reduce concurrency or",
        "                    add sleep(randomBetween(10,30)) before Stage 3.",
        "DB CPU > 20%      → ISR not absorbing load. Check revalidate values.",
        "─────────────────────────────────────────────────────────────────────",
        "Next step: if all checks pass at 50 VUs, rerun at --vus 200.",
        "─────────────────────────────────────────────────────────────────────",
    ].join("\n"));
}
