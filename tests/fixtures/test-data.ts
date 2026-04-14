/**
 * Centralised test data for Miss Tokyo E2E suites.
 *
 * Keep test-specific values here so every spec imports from one place.
 *
 * NOTE: Admin credentials are read from env vars. Set them in .env.test
 * (gitignored). Storefront credentials are intentionally absent — account
 * portal tests validate structure only, not authenticated content.
 */

// ── Routes ────────────────────────────────────────────────────────────────────

export const ROUTES = {
    // Storefront
    home:     "/",
    shop:     "/shop",
    gallery:  "/gallery",
    checkout: "/checkout",
    login:    "/login",

    // Admin
    adminLogin: "/admin/login",
    overview:   "/overview",

    // Dashboard sections
    orders:     "/sales/orders",
    catalog:    "/catalog/products",
    customers:  "/customers",
    settings:   "/settings",
    cms:        "/cms",
    finance:    "/finance",
    analytics:  "/sales/analytics",
    seo:        "/seo",

    // Account portal
    account:          "/account",
    accountOrders:    "/account/orders",
    accountProfile:   "/account/profile",
    accountAddresses: "/account/addresses",
} as const;

// ── Admin auth ────────────────────────────────────────────────────────────────

/** Read from env vars. See .env.test (gitignored). */
export const ADMIN_AUTH = {
    email:    process.env.TEST_ADMIN_EMAIL    ?? "",
    password: process.env.TEST_ADMIN_PASSWORD ?? "",
} as const;

// ── Retail product (used by checkout.spec.ts) ────────────────────────────────

/**
 * A known retail product used for checkout flow tests.
 * The slug here is a fallback — storefront.spec.ts picks real slugs dynamically.
 * Update after confirming a product exists in the live DB.
 */
export const RETAIL_PRODUCT = {
    slug:         "test-retail-dress",
    name:         "Test Retail Dress",
    price:        "GH₵",
    size:         "M",
    color:        "Black",
    categoryName: "Dresses",
} as const;

// ── Wholesale product ─────────────────────────────────────────────────────────

/**
 * A product that belongs exclusively to a wholesale category.
 * Visiting this slug as a guest should return 404.
 */
export const WHOLESALE_PRODUCT = {
    slug:         "test-wholesale-item",
    categoryName: "Wholesale",
} as const;

// ── Checkout form ─────────────────────────────────────────────────────────────

/** Fictional but structurally valid customer. */
export const CHECKOUT_CUSTOMER = {
    fullName: "Abena Playwright",
    email:    "playwright+test@misstokyo.shop",
    phone:    "0241234567",
    address:  "1 Airport Hills, East Legon",
    country:  "Ghana",
    region:   "Greater Accra",
} as const;

/** A gift-card code intercepted at the network layer in tests — no real DB entry needed. */
export const GIFT_CARD_CODE = "TESTGIFT100";
