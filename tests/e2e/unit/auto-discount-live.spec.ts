import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { isAutoDiscountLive, liveAutoDiscounts } from "../../../src/lib/autoDiscount";

// Product ribbons and badges showed automatic discounts that hadn't started or
// had ended, because the shop and product pages read every switched-on rule
// without its dates. They now filter by the same rule checkout charges by.

const ROOT = path.resolve(__dirname, "../../..");
const NOW = new Date("2026-10-21T12:00:00Z");
const rule = (o: { is_active?: boolean | null; starts_at?: string | null; ends_at?: string | null }) =>
    ({ is_active: true, starts_at: "2026-10-01T00:00:00Z", ends_at: null, ...o });

test("live: switched on, started, not ended", () => {
    expect(isAutoDiscountLive(rule({}), NOW)).toBe(true);
    expect(isAutoDiscountLive(rule({ ends_at: "2026-10-31T23:59:00Z" }), NOW)).toBe(true);
    expect(isAutoDiscountLive(rule({ starts_at: NOW.toISOString() }), NOW)).toBe(true);
});

test("not live: off, scheduled, ended, or no start date (as checkout's SQL)", () => {
    expect(isAutoDiscountLive(rule({ is_active: false }), NOW)).toBe(false);
    expect(isAutoDiscountLive(rule({ is_active: null }), NOW)).toBe(false);
    expect(isAutoDiscountLive(rule({ starts_at: "2026-10-22T00:00:00Z" }), NOW)).toBe(false);
    expect(isAutoDiscountLive(rule({ ends_at: "2026-10-20T00:00:00Z" }), NOW)).toBe(false);
    // ends_at.gt.now: a rule ending this instant is over
    expect(isAutoDiscountLive(rule({ ends_at: NOW.toISOString() }), NOW)).toBe(false);
    // starts_at.lte.now never matches NULL in SQL
    expect(isAutoDiscountLive(rule({ starts_at: null }), NOW)).toBe(false);
    expect(isAutoDiscountLive(rule({ starts_at: "not a date" }), NOW)).toBe(false);
});

test("liveAutoDiscounts keeps only live rules, in order", () => {
    const list = [rule({ starts_at: "2026-11-01T00:00:00Z" }), { ...rule({}), id: "a" }, rule({ ends_at: "2026-10-01T00:00:00Z" }), { ...rule({}), id: "b" }];
    expect(liveAutoDiscounts(list, NOW).map(r => (r as { id?: string }).id)).toEqual(["a", "b"]);
});

test("every surface that shows an automatic-discount ribbon filters by date like checkout", () => {
    const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
    const checkoutSql = '.lte("starts_at", new Date().toISOString())';
    expect(read("src/lib/checkout/createCheckoutOrder.ts")).toContain(checkoutSql);
    expect(read("src/app/api/checkout/auto-discount/route.ts")).toContain(checkoutSql);
    for (const page of ["src/app/(shop)/shop/page.tsx", "src/app/(shop)/products/[slug]/page.tsx"]) {
        const src = read(page);
        expect(src, page).toContain("liveAutoDiscounts(rules)");
        expect(src, page).toContain("is_active, starts_at, ends_at");
    }
    expect(read("src/components/ui/miss-tokyo/ShopCatalog.tsx")).toContain('.lte("starts_at", now)');
    // The video gallery and the cart drawer read the date-filtered endpoint
    expect(read("src/components/ui/miss-tokyo/GalleryClient.tsx")).toContain('fetch("/api/checkout/auto-discount")');
    expect(read("src/components/ui/miss-tokyo/CartDrawer.tsx")).toContain("/api/checkout/auto-discount?productIds=");
});
