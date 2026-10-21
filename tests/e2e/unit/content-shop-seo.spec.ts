import { test, expect } from "@playwright/test";
import { withSeoRow } from "../../../src/lib/content/seo";

// A page's search-engine text: the saved row over the page's own.

test("search-engine text: empty saved fields keep the page's own", () => {
    const fallback = { title: "Shop — Miss Tokyo", description: "Browse 240+ styles", alternates: { canonical: "https://misstokyo.shop/shop" } };
    expect(withSeoRow(null, fallback)).toBe(fallback);
    expect(withSeoRow({ title: " ", description: null, keywords: "", og_image_url: null }, fallback)).toEqual(fallback);
    const out = withSeoRow({ title: "Shop all", description: "Everything", keywords: "dresses", og_image_url: "https://x/og.webp" }, fallback);
    expect(out).toEqual({ ...fallback, title: "Shop all", description: "Everything", keywords: "dresses", openGraph: { images: ["https://x/og.webp"] } });
});
