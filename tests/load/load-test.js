/**
 * load-test.js — Miss Tokyo k6 Load Test
 * ─────────────────────────────────────────────────────────────────────────────
 * Simulates 1,000 concurrent shoppers across three phases:
 *
 *   Phase 1 (ramp-up)  : 0 → 1,000 VUs over 2 minutes
 *   Phase 2 (sustain)  : 1,000 VUs for 3 minutes
 *   Phase 3 (ramp-down): 1,000 → 0 VUs over 1 minute
 *
 * Behaviour modelled:
 *   60% — Homepage visit only (lightest DB hit, tests SSR + CDN)
 *   25% — Homepage → Shop browse (triggers /api/products paginated query)
 *   15% — Homepage → Shop → PDP   (deepest path; tests product + related query)
 *
 * Install & run:
 *   brew install k6                                   # macOS
 *   sudo apt-get install k6                           # Ubuntu / Debian
 *
 *   BASE_URL=https://misstokyo.shop k6 run tests/load/load-test.js
 *   BASE_URL=http://localhost:3000   k6 run tests/load/load-test.js --vus 50 --duration 30s
 *
 * Output a summary JSON:
 *   k6 run tests/load/load-test.js --out json=tests/reports/k6-summary.json
 */

import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

// ── Target ────────────────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

// ── Custom metrics ────────────────────────────────────────────────────────────

const errorRate       = new Rate("error_rate");          // % of requests that fail
const shopQueryTime   = new Trend("shop_query_ms");      // /api/products latency
const pdpLoadTime     = new Trend("pdp_load_ms");        // product page latency
const homeLoadTime    = new Trend("home_load_ms");       // homepage latency
const checkoutHits    = new Counter("checkout_visits");  // users who reached /checkout

// ── Scenarios / load shape ────────────────────────────────────────────────────

export const options = {
    scenarios: {
        ramp_up_sustain_ramp_down: {
            executor: "ramping-vus",
            startVUs: 0,
            stages: [
                { duration: "2m", target: 1000 },  // Phase 1: ramp up
                { duration: "3m", target: 1000 },  // Phase 2: sustain
                { duration: "1m", target: 0    },  // Phase 3: ramp down
            ],
            gracefulRampDown: "30s",
        },
    },

    // ── Thresholds (SLOs) ─────────────────────────────────────────────────
    // Fail the test if any of these are breached during the sustain phase.
    thresholds: {
        // 95th-percentile response time must stay under 3 seconds.
        http_req_duration: ["p(95)<3000"],
        // 99th-percentile under 5 seconds.
        "http_req_duration{scenario:ramp_up_sustain_ramp_down}": ["p(99)<5000"],
        // Overall error rate below 1%.
        error_rate: ["rate<0.01"],
        // Shop API 95th-percentile under 2.5 seconds.
        shop_query_ms: ["p(95)<2500"],
        // PDP 95th-percentile under 3 seconds.
        pdp_load_ms: ["p(95)<3000"],
        // Homepage 95th-percentile under 2 seconds.
        home_load_ms: ["p(95)<2000"],
    },
};

// ── Shared product slugs ──────────────────────────────────────────────────────
// Replace with real slugs from your products table (at least 5–10 for variety).
const PRODUCT_SLUGS = [
    "test-retail-dress",          // update with real slugs
    "summer-midi-dress",
    "classic-wrap-top",
    "high-waist-trousers",
    "printed-co-ord-set",
];

/** Returns a random item from an array. */
function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/** Performs an HTTP GET and records pass/fail in the shared error rate. */
function checkedGet(url, params, metricTrend) {
    const start = Date.now();
    const res   = http.get(url, params);
    const ms    = Date.now() - start;

    const ok = check(res, {
        "status 200":    (r) => r.status === 200,
        "body non-empty":(r) => r.body && r.body.length > 0,
    });

    errorRate.add(!ok);
    if (metricTrend) metricTrend.add(ms);

    return res;
}

// ── User journeys ─────────────────────────────────────────────────────────────

function journeyHomepageOnly() {
    group("Homepage", () => {
        checkedGet(`${BASE_URL}/`, null, homeLoadTime);
        sleep(randomThinkTime(2, 5));
    });
}

function journeyShopBrowse() {
    group("Homepage", () => {
        checkedGet(`${BASE_URL}/`, null, homeLoadTime);
        sleep(randomThinkTime(1, 3));
    });

    group("Shop page (SSR)", () => {
        checkedGet(`${BASE_URL}/shop`, null, null);
        sleep(randomThinkTime(1, 2));
    });

    group("Shop API — page 1", () => {
        checkedGet(`${BASE_URL}/api/products?page=1`, null, shopQueryTime);
        sleep(randomThinkTime(2, 5));
    });

    // 40% of shop browsers load a second page (load-more simulation).
    if (Math.random() < 0.4) {
        group("Shop API — page 2 (load more)", () => {
            checkedGet(`${BASE_URL}/api/products?page=2`, null, shopQueryTime);
            sleep(randomThinkTime(1, 3));
        });
    }

    // 20% apply a category filter.
    if (Math.random() < 0.2) {
        group("Shop API — filtered by category", () => {
            checkedGet(`${BASE_URL}/api/products?category=dresses&page=1`, null, shopQueryTime);
            sleep(randomThinkTime(1, 2));
        });
    }
}

function journeyShopToPDP() {
    group("Homepage", () => {
        checkedGet(`${BASE_URL}/`, null, homeLoadTime);
        sleep(randomThinkTime(1, 2));
    });

    group("Shop page (SSR)", () => {
        checkedGet(`${BASE_URL}/shop`, null, null);
        sleep(randomThinkTime(1, 2));
    });

    group("Shop API", () => {
        checkedGet(`${BASE_URL}/api/products?page=1`, null, shopQueryTime);
        sleep(randomThinkTime(1, 3));
    });

    const slug = randomItem(PRODUCT_SLUGS);
    group("Product Detail Page (PDP)", () => {
        checkedGet(`${BASE_URL}/products/${slug}`, null, pdpLoadTime);
        sleep(randomThinkTime(3, 8));
    });

    // 30% of PDP visitors proceed to checkout.
    if (Math.random() < 0.3) {
        group("Checkout page", () => {
            checkedGet(`${BASE_URL}/checkout`, null, null);
            checkoutHits.add(1);
            sleep(randomThinkTime(5, 15));
        });
    }
}

/** Returns a random float between min and max seconds (think time / idle). */
function randomThinkTime(min, max) {
    return min + Math.random() * (max - min);
}

// ── Main VU entrypoint ────────────────────────────────────────────────────────

export default function () {
    const roll = Math.random();

    if (roll < 0.60) {
        journeyHomepageOnly();
    } else if (roll < 0.85) {
        journeyShopBrowse();
    } else {
        journeyShopToPDP();
    }
}

// ── Summary handler ────────────────────────────────────────────────────────────
// Printed after the test completes. Shows pass/fail per threshold.

export function handleSummary(data) {
    const thresholds = data.metrics;
    console.log("\n═══════════════════ Miss Tokyo Load Test Summary ═══════════════════");
    console.log(`  VUs peak      : 1,000`);
    console.log(`  Duration      : 6 minutes total (2 ramp / 3 sustain / 1 ramp-down)`);
    console.log(`  Total requests: ${data.metrics.http_reqs?.values?.count ?? "—"}`);
    console.log(`  Error rate    : ${(data.metrics.error_rate?.values?.rate * 100 ?? 0).toFixed(2)}%`);
    console.log(`  p95 response  : ${data.metrics.http_req_duration?.values?.["p(95)"]?.toFixed(0) ?? "—"} ms`);
    console.log(`  p99 response  : ${data.metrics.http_req_duration?.values?.["p(99)"]?.toFixed(0) ?? "—"} ms`);
    console.log(`  Shop API p95  : ${data.metrics.shop_query_ms?.values?.["p(95)"]?.toFixed(0) ?? "—"} ms`);
    console.log(`  PDP p95       : ${data.metrics.pdp_load_ms?.values?.["p(95)"]?.toFixed(0) ?? "—"} ms`);
    console.log(`  Checkout hits : ${data.metrics.checkout_visits?.values?.count ?? 0}`);
    console.log("════════════════════════════════════════════════════════════════════\n");

    return {
        "tests/reports/k6-summary.json": JSON.stringify(data, null, 2),
    };
}
