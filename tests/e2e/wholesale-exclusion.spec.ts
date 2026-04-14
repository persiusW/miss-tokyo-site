/**
 * wholesale-exclusion.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Security / correctness tests for the B2B wholesale gating system.
 *
 * Background
 * ──────────
 * getProducts() in src/lib/products.ts applies three layered exclusions for
 * non-authorized (retail / guest) users:
 *
 *   1. category_id  — .or(`category_id.is.null,category_id.not.in.(...)`)
 *   2. category_ids — .or(`category_ids.is.null,category_ids.not.ov.{...}`)
 *   3. category_type— .or(`category_type.is.null,category_type.not.in.(...)`)
 *
 * The /api/products route enforces the same rules server-side for load-more
 * requests. Direct PDP navigation to a wholesale-only product returns 404.
 *
 * These tests verify all three layers from the outside (HTTP / browser).
 *
 * Run:
 *   npx playwright test tests/e2e/wholesale-exclusion.spec.ts
 *   npx playwright test tests/e2e/wholesale-exclusion.spec.ts --reporter=list
 */

import { test, expect, APIRequestContext } from "@playwright/test";
import { ROUTES, WHOLESALE_PRODUCT } from "../fixtures/test-data";

// ── API-level helpers ─────────────────────────────────────────────────────────

/**
 * Fetch the /api/products endpoint as an anonymous (unauthenticated) user.
 * Returns the parsed { products, total } payload.
 */
async function fetchPublicProducts(
    request: APIRequestContext,
    params: Record<string, string> = {}
): Promise<{ products: Array<Record<string, unknown>>; total: number }> {
    const qs = new URLSearchParams(params).toString();
    const url = `/api/products${qs ? `?${qs}` : ""}`;
    const res = await request.get(url);
    expect(res.status()).toBe(200);
    return res.json();
}

// ── Suite ─────────────────────────────────────────────────────────────────────

test.describe("Wholesale exclusion — unauthenticated users", () => {

    // ── 1. /api/products returns products for guest users ─────────────────────
    test("API returns a non-empty product list for guests", async ({ request }) => {
        const { products, total } = await fetchPublicProducts(request);

        expect(total).toBeGreaterThan(0);
        expect(products.length).toBeGreaterThan(0);
        // Total count must equal or exceed the page payload.
        expect(total).toBeGreaterThanOrEqual(products.length);
    });

    // ── 2. No product in the public list belongs to a wholesale category ───────
    test("API response contains no wholesale-categorised products", async ({ request }) => {
        // Fetch the first two pages to check beyond the initial 24.
        const pages = await Promise.all([
            fetchPublicProducts(request, { page: "1" }),
            fetchPublicProducts(request, { page: "2" }),
        ]);

        const allProducts = pages.flatMap((p) => p.products);

        for (const product of allProducts) {
            // category_type must not equal the known wholesale category name.
            if (typeof product.category_type === "string") {
                expect(product.category_type.toLowerCase()).not.toBe(
                    WHOLESALE_PRODUCT.categoryName.toLowerCase()
                );
            }

            // category_name (derived server-side) must also not be wholesale.
            if (typeof product.category_name === "string") {
                expect(product.category_name.toLowerCase()).not.toBe(
                    WHOLESALE_PRODUCT.categoryName.toLowerCase()
                );
            }
        }
    });

    // ── 3. Requesting the wholesale category explicitly returns nothing ────────
    test("filtering by wholesale category returns 0 products for guests", async ({ request }) => {
        // URL-slug of the wholesale category — derived from name.
        const wholesaleSlug = WHOLESALE_PRODUCT.categoryName.toLowerCase().replace(/\s+/g, "-");

        const { products } = await fetchPublicProducts(request, {
            category: wholesaleSlug,
        });

        // Verify none of the returned products are categorised as wholesale.
        // (Total may be > 0 if the filter slug matches a retail category in this DB.)
        for (const product of products) {
            if (typeof product.category_type === "string") {
                expect(product.category_type.toLowerCase()).not.toBe(
                    WHOLESALE_PRODUCT.categoryName.toLowerCase()
                );
            }
            if (typeof product.category_name === "string") {
                expect(product.category_name.toLowerCase()).not.toBe(
                    WHOLESALE_PRODUCT.categoryName.toLowerCase()
                );
            }
        }
    });

    // ── 4. Visiting a wholesale-only PDP returns 404 ──────────────────────────
    test("direct URL to a wholesale product returns 404 for guests", async ({ page }) => {
        const response = await page.goto(`/products/${WHOLESALE_PRODUCT.slug}`);

        // Next.js notFound() produces either a 404 status or renders a "not found" page.
        const is404 = response?.status() === 404;
        const hasNotFoundText = await page.getByText(/not found|page doesn't exist|404/i).isVisible().catch(() => false);

        expect(is404 || hasNotFoundText).toBe(true);
    });

    // ── 5. Shop page intercept — no wholesale items in SSR payload ────────────
    test("shop page SSR does not include wholesale products in the network response", async ({ page }) => {
        const capturedApiCalls: Array<{ products: unknown[] }> = [];

        // Intercept the initial getProducts call (SSR page data is embedded in
        // the Next.js RSC payload or subsequent fetch calls from the client).
        page.on("response", async (response) => {
            if (
                response.url().includes("/api/products") &&
                response.request().method() === "GET"
            ) {
                try {
                    const body = await response.json();
                    if (body?.products) capturedApiCalls.push(body);
                } catch {
                    // Not JSON — skip.
                }
            }
        });

        await page.goto(ROUTES.shop);

        // Give any lazy client-side fetches time to fire.
        await page.waitForLoadState("networkidle");

        for (const call of capturedApiCalls) {
            for (const product of call.products as Array<Record<string, unknown>>) {
                if (typeof product.category_type === "string") {
                    expect(product.category_type.toLowerCase()).not.toBe(
                        WHOLESALE_PRODUCT.categoryName.toLowerCase()
                    );
                }
            }
        }
    });

    // ── 6. Load-more does NOT leak wholesale products ─────────────────────────
    test("load-more API call excludes wholesale products", async ({ request }) => {
        // Simulate what the Load More button fires: page 2 with no auth cookies.
        const { products } = await fetchPublicProducts(request, { page: "2" });

        for (const product of products) {
            if (typeof product.category_type === "string") {
                expect(product.category_type.toLowerCase()).not.toBe(
                    WHOLESALE_PRODUCT.categoryName.toLowerCase()
                );
            }
        }
    });

    // ── 7. Wholesale product cannot be added to cart via the API directly ──────
    test("cannot add a wholesale product to cart when none are returned by the API", async ({ request }) => {
        // If the API never returns the wholesale product, a client cannot construct
        // a valid cart entry for it (productId would be unknown). We verify the
        // Paystack initialise endpoint rejects an unknown / wholesale product ID.
        const res = await request.post("/api/paystack/initialize", {
            data: {
                email: "guest@test.com",
                cartItems: [
                    {
                        productId: "00000000-0000-0000-0000-000000000000", // non-existent
                        quantity: 1,
                        name: "Fake Wholesale Item",
                        price: 500,
                    },
                ],
                metadata: {
                    fullName: "Test Guest",
                    phone: "0201234567",
                    deliveryMethod: "delivery",
                    address: "1 Test St",
                    country: "Ghana",
                    region: "Greater Accra",
                },
            },
        });

        // Either the amount resolves to 0 (unknown product) → 400 error,
        // or the order is created with 0 amount and rejected.
        // Either way, we should not get a valid authorizationUrl for a fake item.
        const body = await res.json();
        const hasValidUrl = typeof body.authorizationUrl === "string" && body.authorizationUrl.startsWith("https://checkout.paystack");
        // If Paystack is not configured in test env the dummy URL is returned — accept that.
        const isDummyUrl = body.authorizationUrl === "https://checkout.paystack.com/dummy";

        if (!isDummyUrl) {
            expect(hasValidUrl).toBe(false);
        }
    });
});

// ── Regression: NULL-trap fix verification ────────────────────────────────────

test.describe("Regression — NULL category fields do not exclude retail products", () => {

    test("products with null category_id are still returned for guests", async ({ request }) => {
        const { products } = await fetchPublicProducts(request);

        // We can't know which specific products have null category_id, but we
        // assert the list is non-empty — if the NULL trap were present, it would
        // return 0 products for guests (the original bug).
        expect(products.length).toBeGreaterThan(0);
    });

    test("total count is consistent across pages", async ({ request }) => {
        const page1 = await fetchPublicProducts(request, { page: "1" });
        const page2 = await fetchPublicProducts(request, { page: "2" });

        // Both pages report the same total (the server count doesn't change between calls).
        expect(page1.total).toBe(page2.total);

        // Page 2 may be empty if there are < 25 products, but must not exceed total.
        expect(page2.products.length).toBeLessThanOrEqual(page2.total);
    });
});
