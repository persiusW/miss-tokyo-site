/**
 * Centralised test data for Miss Tokyo E2E suites.
 *
 * Keep test-specific values here so every spec imports from one place.
 * Update these when seeding the Supabase test / staging DB.
 */

export const ROUTES = {
    home:     "/",
    shop:     "/shop",
    gallery:  "/gallery",
    checkout: "/checkout",
    login:    "/login",
} as const;

/** A known, always-active retail product in the staging / dev database. */
export const RETAIL_PRODUCT = {
    slug:         "test-retail-dress",          // update after seeding
    name:         "Test Retail Dress",
    price:        "GH₵",                        // prefix — price varies
    size:         "M",
    color:        "Black",
    categoryName: "Dresses",
} as const;

/**
 * A product that belongs exclusively to a wholesale category.
 * Visiting this slug as a guest should return 404.
 * Replace with a real slug from your DB once seeded.
 */
export const WHOLESALE_PRODUCT = {
    slug:         "test-wholesale-item",        // update after seeding
    categoryName: "Wholesale",                  // must match `categories.name` where is_wholesale=true
} as const;

/**
 * A valid gift-card / coupon code that exists in the staging DB.
 * Replace with a real seeded code before running checkout tests.
 */
export const GIFT_CARD_CODE = "TESTGIFT100";

/** Checkout form — fictional but structurally valid. */
export const CHECKOUT_CUSTOMER = {
    fullName: "Abena Playwright",
    email:    "playwright+test@misstokyo.shop",
    phone:    "0241234567",
    address:  "1 Airport Hills, East Legon",
    country:  "Ghana",
    region:   "Greater Accra",
} as const;
