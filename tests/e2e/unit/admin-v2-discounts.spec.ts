import { test, expect } from "@playwright/test";
import { PAID_LEGACY_STATUSES } from "../../../src/lib/admin/v2/customers";
import fs from "fs";
import path from "path";
import {
    DEFAULT_QUERY, autoPayload, autoStatus, chipCounts, couponPayload, couponStatus, datesText, emptyForm, filterList, findOverlaps,
    formFromAuto, formFromCoupon, fromAuto, fromCoupon, idFromPath, discountHref, listNames, listSearch, makeCode, parseListQuery,
    sharedTarget, sortList, summarySentence, validateForm,
    type AutoRow, type CouponRow, type Names,
} from "../../../src/lib/admin/v2/discounts";

// Admin v2 Discounts: status, the merged list's URL state, the overlap warning,
// the summary sentence and what the panel saves. Pure: no database.

const ROOT = path.resolve(__dirname, "../../..");
const NOW = new Date("2026-10-21T12:00:00Z");
const names: Names = { categories: { c1: "Slides", c2: "Dresses" }, products: { p1: "Leather Slides", p2: "Silk Dress", p3: "Tote" } };
const productCategories = { p1: ["c1"], p2: ["c2"], p3: [] };

const coupon = (o: Partial<CouponRow> = {}): CouponRow => ({
    id: "k1", code: "HARMATTAN20", discount_type: "percentage", discount_value: 20, min_order_value: 0, usage_limit: null, used_count: 0,
    is_active: true, starts_at: null, expires_at: null, buy_quantity: null, get_quantity: null, free_shipping: false, category_id: null,
    single_use_per_customer: false, created_at: "2026-10-01T10:00:00Z", ...o,
});
const auto = (o: Partial<AutoRow> = {}): AutoRow => ({
    id: "a1", title: "Slides: 2 for 600", is_active: true, discount_type: "FIXED", discount_value: 100, applies_to: "SPECIFIC_CATEGORIES",
    target_category_ids: ["c1"], target_product_ids: [], min_quantity: 2, quantity_scope: "ACROSS_TARGET", min_order_amount: null,
    starts_at: "2026-10-01T00:00:00Z", ends_at: "2026-10-31T23:59:00Z", created_at: "2026-10-01T10:00:00Z", ...o,
});
const res = { orders: 3, sales: 900, given: 120, shared: 0, all: 5 };

test.describe("status", () => {
    test("codes: off, scheduled, ended, used up, active", () => {
        expect(couponStatus(coupon({ is_active: false }), NOW).status).toBe("off");
        expect(couponStatus(coupon({ starts_at: "2026-11-01T00:00:00Z" }), NOW).status).toBe("scheduled");
        expect(couponStatus(coupon({ expires_at: "2026-10-20T00:00:00Z" }), NOW)).toEqual({ status: "ended", label: "Ended" });
        expect(couponStatus(coupon({ usage_limit: 5, used_count: 5 }), NOW)).toEqual({ status: "ended", label: "Used up" });
        expect(couponStatus(coupon(), NOW).status).toBe("active");
    });
    test("automatic: off, scheduled, ended, active", () => {
        expect(autoStatus(auto({ is_active: false }), NOW).status).toBe("off");
        expect(autoStatus(auto({ starts_at: "2026-11-01T00:00:00Z" }), NOW).status).toBe("scheduled");
        expect(autoStatus(auto({ ends_at: "2026-10-01T00:00:00Z" }), NOW).status).toBe("ended");
        expect(autoStatus(auto(), NOW).status).toBe("active");
    });
});

test.describe("one merged list", () => {
    const rows = [
        fromCoupon(coupon(), names, res, NOW),
        fromCoupon(coupon({ id: "k2", code: "OLD10", expires_at: "2026-09-01T00:00:00Z", created_at: "2026-08-01T00:00:00Z" }), names, null, NOW),
        fromAuto(auto(), names, res, NOW),
        fromAuto(auto({ id: "a2", title: "Black Friday", starts_at: "2026-11-27T00:00:00Z", ends_at: null }), names, null, NOW),
    ];
    test("each row says what it is, what it covers and how much it was used", () => {
        expect(rows[0]).toMatchObject({ kind: "code", name: "HARMATTAN20", value: "20% off", applies: "Everything", used: 0, limit: null });
        expect(rows[2]).toMatchObject({ kind: "auto", value: "GH₵ 100 off", applies: "Slides", used: 5 });
        expect(fromCoupon(coupon({ category_id: "c2" }), names, null, NOW).applies).toBe("Everything (marked Dresses)");
        expect(fromCoupon(coupon({ discount_type: "free_shipping" }), names, null, NOW).applies).toBe("Delivery");
        expect(fromCoupon(coupon({ discount_type: "buy_x_get_y", buy_quantity: 2, get_quantity: 1 }), names, null, NOW).value).toBe("Buy 2, get 1 free");
    });
    test("chips, type and search come from the URL and drop what isn't valid", () => {
        expect(parseListQuery(new URLSearchParams("status=scheduled&type=auto&q=%20slides%20"))).toEqual({ status: "scheduled", type: "auto", q: "slides" });
        expect(parseListQuery({ status: "nope", type: "x" })).toEqual(DEFAULT_QUERY);
        expect(listSearch(DEFAULT_QUERY)).toBe("");
        expect(listSearch(DEFAULT_QUERY, { type: "code", q: "harm" })).toBe("?type=code&q=harm");
    });
    test("filtering and chip counts", () => {
        expect(filterList(rows, { ...DEFAULT_QUERY, type: "auto" }).map(r => r.id)).toEqual(["a1", "a2"]);
        expect(filterList(rows, { ...DEFAULT_QUERY, status: "ended" }).map(r => r.id)).toEqual(["k2"]);
        expect(filterList(rows, { ...DEFAULT_QUERY, q: "harm" }).map(r => r.id)).toEqual(["k1"]);
        expect(chipCounts(rows, { ...DEFAULT_QUERY, status: "ended" })).toEqual({ all: 4, active: 2, scheduled: 1, ended: 1 });
        expect(chipCounts(rows, { ...DEFAULT_QUERY, type: "code" })).toEqual({ all: 2, active: 1, scheduled: 0, ended: 1 });
    });
    test("live first, then scheduled, then ended", () => {
        expect(sortList(rows).map(r => r.status)).toEqual(["active", "active", "scheduled", "ended"]);
    });
    test("dates read plainly", () => {
        expect(datesText(null, null)).toBe("No end date");
        expect(datesText("2026-10-01T00:00:00Z", "2026-10-31T23:59:00Z")).toBe("1 Oct 2026 – 31 Oct 2026");
        expect(datesText("2026-10-01T09:30:00Z", null)).toBe("1 Oct 2026, 09:30 onwards");
        expect(listNames(["A", "B", "C", "D"])).toBe("A, B and 2 more");
    });
    test("deep link ids", () => {
        expect(discountHref("a b", "?type=auto")).toBe("/discounts/a%20b?type=auto");
        expect(idFromPath("/discounts/abc")).toBe("abc");
        expect(idFromPath("/discounts")).toBeNull();
    });
});

test.describe("overlap warning (gap 15)", () => {
    test("targets: everything meets anything; categories meet their products", () => {
        expect(sharedTarget({ all: true }, { all: true }, names, productCategories)).toBe("every product");
        expect(sharedTarget({ all: true }, { categories: ["c1"] }, names, productCategories)).toBe("Slides");
        expect(sharedTarget({ categories: ["c1"] }, { categories: ["c2"] }, names, productCategories)).toBeNull();
        expect(sharedTarget({ categories: ["c1"] }, { products: ["p1", "p2"] }, names, productCategories)).toBe("Leather Slides");
        expect(sharedTarget({ products: ["p3"] }, { products: ["p1"] }, names, productCategories)).toBeNull();
        expect(sharedTarget({ delivery: true }, { all: true }, names, productCategories)).toBeNull();
    });
    test("a code and an automatic discount: the sentence says what checkout does", () => {
        const rows = [fromCoupon(coupon({ expires_at: "2026-10-31T23:59:00Z" }), names, null, NOW), fromAuto(auto(), names, null, NOW)];
        const [o] = findOverlaps(rows, names, productCategories, NOW);
        expect(o.title).toBe("Two discounts can apply to Slides");
        expect(o.a.kind).toBe("code");
        expect(o.body).toContain("HARMATTAN20 and “Slides: 2 for 600” overlap until 31 Oct 2026.");
        // createCheckoutOrder: the code only applies to items no automatic rule covers
        expect(o.body).toContain("the code comes off the rest of the cart only");
        expect(o.body).toContain("If every item has the automatic discount, the code can't be used.");
        expect(o.body).not.toMatch(/larger saving/);
    });
    test("two automatic discounts: the bigger saving takes the shared items", () => {
        const rows = [fromAuto(auto(), names, null, NOW), fromAuto(auto({ id: "a2", title: "Leather Slides 10%", applies_to: "SPECIFIC_PRODUCTS", target_category_ids: [], target_product_ids: ["p1"] }), names, null, NOW)];
        const [o] = findOverlaps(rows, names, productCategories, NOW);
        expect(o.what).toBe("Leather Slides");
        expect(o.body).toContain("the one that saves more on that cart takes the items they share");
        expect(o.body).toContain("never get both on one item");
    });
    test("two codes never overlap, nor do ended/off ones, nor ones whose dates don't meet", () => {
        const two = [fromCoupon(coupon(), names, null, NOW), fromCoupon(coupon({ id: "k2", code: "B" }), names, null, NOW)];
        expect(findOverlaps(two, names, productCategories, NOW)).toEqual([]);
        const off = [fromCoupon(coupon({ is_active: false }), names, null, NOW), fromAuto(auto(), names, null, NOW)];
        expect(findOverlaps(off, names, productCategories, NOW)).toEqual([]);
        const apart = [fromCoupon(coupon({ starts_at: "2026-11-05T00:00:00Z" }), names, null, NOW), fromAuto(auto(), names, null, NOW)];
        expect(findOverlaps(apart, names, productCategories, NOW)).toEqual([]);
    });
    test("the wording matches the checkout code it describes", () => {
        const engine = fs.readFileSync(path.join(ROOT, "src/lib/autoDiscount.ts"), "utf8");
        expect(engine).toContain("If the same item qualifies for two rules, the higher-discount rule wins");
        expect(engine).toContain("Coupon / gift-card codes only apply to the subtotal of items NOT covered by auto discounts");
        expect(engine).toContain("When every item in the cart is covered, coupons are blocked entirely");
        const checkout = fs.readFileSync(path.join(ROOT, "src/lib/checkout/createCheckoutOrder.ts"), "utf8");
        expect(checkout).toContain("couponBlocked = cartArr.every(i => autoResult.coveredProductIds.has(i.productId))");
        // Codes ignore coupons.category_id at checkout, which is why a code's target is everything
        expect(fs.readFileSync(path.join(ROOT, "src/lib/discountValidation.ts"), "utf8")).not.toContain("category_id");
    });
});

test.describe("the panel", () => {
    test("a new code: summary sentence updates with the form", () => {
        const f = { ...emptyForm("code", NOW), code: "HARM20", value: "20", condition: "min" as const, minTotal: "500", limit: "100", oncePerCustomer: true, hasEnd: true, end: "2026-10-31T23:59" };
        expect(summarySentence(f, names, NOW)).toMatch(/^20% off everything, on orders over GH₵ 500\. Up to 100 uses, once per customer\. Ends 31 Oct 2026\.$/);
        expect(summarySentence({ ...f, codeType: "free_shipping" }, names, NOW)).toMatch(/^Free delivery on the order, on orders over GH₵ 500\./);
    });
    test("a new automatic discount: quantity and scope are spelled out", () => {
        const f = { ...emptyForm("auto", NOW), title: "2 slides", autoType: "FIXED" as const, value: "100", applies: "SPECIFIC_CATEGORIES" as const, categoryIds: ["c1"], condition: "qty" as const, minQty: "2", qtyScope: "PER_PRODUCT" as const };
        expect(summarySentence(f, names, NOW)).toMatch(/^GH₵ 100 off Slides, when they buy 2 or more of the same product\. Applies by itself, no code needed\. No end date\.$/);
    });
    test("validation explains what to fix", () => {
        const e = validateForm({ ...emptyForm("code", NOW), code: "has space", value: "120" });
        expect(e.code).toMatch(/capital letters/);
        expect(e.value).toMatch(/between 1 and 100/);
        expect(validateForm({ ...emptyForm("code", NOW), code: "OLD code" }, false).code).toBeUndefined();
        const a = validateForm({ ...emptyForm("auto", NOW), value: "10", applies: "SPECIFIC_PRODUCTS", condition: "qty", minQty: "1", hasEnd: true, end: "" });
        expect(Object.keys(a).sort()).toEqual(["end", "minQty", "targets", "title"]);
        expect(validateForm({ ...emptyForm("code", NOW), code: "BXGY", codeType: "buy_x_get_y", buyQty: "2", getQty: "1" })).toEqual({});
    });
    test("a code saves the same columns the old page wrote, plus start and once per customer", () => {
        const f = { ...emptyForm("code", NOW), code: "harm 20", value: "20", applies: "SPECIFIC_CATEGORIES" as const, categoryIds: ["c2"], condition: "min" as const, minTotal: "500", limit: "", start: "", hasEnd: false };
        expect(couponPayload(f)).toEqual({
            code: "HARM20", discount_type: "percentage", discount_value: 20, free_shipping: false, buy_quantity: null, get_quantity: null,
            category_id: "c2", min_order_value: 500, usage_limit: null, single_use_per_customer: false, starts_at: null, expires_at: null,
        });
        // discount_value is NOT NULL: the old page sent null for free shipping, so it could never be created
        const fs1 = couponPayload({ ...f, codeType: "free_shipping" });
        expect(fs1).toMatchObject({ discount_value: 0, free_shipping: true, category_id: null });
        expect(couponPayload({ ...f, codeType: "buy_x_get_y", buyQty: "3", getQty: "1" })).toMatchObject({ discount_value: 0, buy_quantity: 3, get_quantity: 1 });
    });
    test("an automatic discount round-trips through the form unchanged", () => {
        const row = auto({ min_order_amount: 300, quantity_scope: "PER_PRODUCT" });
        const back = autoPayload(formFromAuto(row), NOW);
        expect(back).toMatchObject({
            title: row.title, discount_type: "FIXED", discount_value: 100, applies_to: "SPECIFIC_CATEGORIES", target_category_ids: ["c1"],
            target_product_ids: [], min_quantity: 2, quantity_scope: "PER_PRODUCT", min_order_amount: 300,
        });
        expect(new Date(back.starts_at).getTime()).toBe(new Date(row.starts_at!).getTime());
        expect(new Date(back.ends_at!).getTime()).toBe(new Date(row.ends_at!).getTime());
        const none = autoPayload(formFromAuto(auto({ min_quantity: 1, min_order_amount: null, applies_to: "ALL_PRODUCTS" })), NOW);
        expect(none).toMatchObject({ min_quantity: 1, min_order_amount: null, applies_to: "ALL_PRODUCTS", target_category_ids: [] });
    });
    test("a code round-trips through the form unchanged", () => {
        const row = coupon({ discount_type: "fixed", discount_value: 50, min_order_value: 200, usage_limit: 10, expires_at: "2026-10-31T00:00:00Z", single_use_per_customer: true });
        expect(couponPayload(formFromCoupon(row))).toMatchObject({
            code: "HARMATTAN20", discount_type: "fixed", discount_value: 50, min_order_value: 200, usage_limit: 10, single_use_per_customer: true,
            expires_at: "2026-10-31T00:00:00.000Z",
        });
    });
    test("Make one up gives a readable code", () => {
        let i = 0;
        const c = makeCode(() => (i++ % 10) / 10);
        expect(c).toMatch(/^MT[A-Z2-9]{6}$/);
        expect(makeCode()).not.toMatch(/[01OI]/);
    });
});

test.describe("results per discount (gap 16)", () => {
    const sql = fs.readFileSync(path.join(ROOT, "supabase/migrations/20261022072000_discount_results.sql"), "utf8");
    const summary = fs.readFileSync(path.join(ROOT, "supabase/migrations/20261022042000_fn_sales_summary.sql"), "utf8");
    const legacy = (s: string) => /status in \(([^)]+)\)/.exec(s)?.[1].replace(/\s+/g, "");
    test("paid orders only, with exactly fn_sales_summary's paid rule", () => {
        expect(sql).toContain("x.payment_status = 'paid'");
        expect(legacy(sql)).toBe(legacy(summary));
        expect(legacy(sql)).toBe(PAID_LEGACY_STATUSES.map(s => `'${s}'`).join(","));
    });
    test("the same sums as Analytics' discount performance: total_amount and discount_amount per code", () => {
        expect(sql).toContain("sum(o.total_amount) filter (where o.paid)");
        expect(sql).toContain("sum(o.discount_amount) filter (where o.paid)");
        const reports = fs.readFileSync(path.join(ROOT, "src/app/(dashboard)/sales/analytics/page.tsx"), "utf8");
        expect(reports).toContain("discMap[code].savings += Number(o.discount_amount ?? 0)");
        expect(reports).toContain("discMap[code].revenue += Number(o.total_amount ?? 0)");
    });
    test("an order with two automatic discounts isn't split by guesswork", () => {
        expect(sql).toContain("filter (where t.paid and t.n_titles = 1)");
        expect(sql).toContain("count(*) filter (where t.paid and t.n_titles > 1)");
    });
    test("service role only, and never cut off at 1000 rows", () => {
        expect(sql).toContain("revoke execute on function public.fn_discount_results() from public, anon, authenticated");
        const load = fs.readFileSync(path.join(ROOT, "src/lib/admin/v2/discountsLoad.ts"), "utf8");
        expect(load).toMatch(/all<[^>]+>\(\s*\(\) => db\.rpc\("fn_discount_results"\)/);
    });
});
