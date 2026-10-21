import { test, expect } from "@playwright/test";
import { computeDiscountSplit } from "../../../src/lib/discountSplit";
import {
    computeCouponSplit, couponCategoryId, couponLabel, isItemCoupon, itemCouponShortfall, itemCouponShortfallText,
    needsRecheck, productCategoryIds, splitAppliedCode, type CodeLine, type CouponTerms,
} from "../../../src/lib/couponValue";

// What a code is worth against a real basket. Whole-cart codes must be worth
// exactly what computeDiscountSplit always said; item codes (a category, sale
// price, buy X get Y) are new and price line by line.

const DRESSES = "11111111-1111-4111-8111-111111111111";
const TOPS = "22222222-2222-4222-8222-222222222222";

const line = (productId: string, unitPrice: number, quantity: number, cats: string[] = [], covered = false): CodeLine =>
    ({ productId, unitPrice, quantity, categoryIds: cats, covered });

const terms = (t: Partial<CouponTerms>): CouponTerms => ({
    discount_type: "fixed", discount_value: 0, category_id: null, target_category_id: null, buy_quantity: null, get_quantity: null, ...t,
});

const total = (lines: CodeLine[]) => lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

test.describe("whole-cart codes are unchanged", () => {
    const baskets: { lines: CodeLine[]; fee: number }[] = [
        { lines: [line("a", 120, 1)], fee: 0 },
        { lines: [line("a", 120, 2), line("b", 45.5, 1)], fee: 35 },
        { lines: [line("a", 15, 1)], fee: 50 },
        { lines: [line("a", 0.1, 3), line("b", 0.2, 1)], fee: 0.3 },
        { lines: [line("a", 670, 1)], fee: 35 },
    ];
    const codes: CouponTerms[] = [
        terms({ discount_type: "fixed", discount_value: 50 }),
        terms({ discount_type: "fixed", discount_value: "900" }),
        terms({ discount_type: "fixed", discount_value: 0.01 }),
        terms({ discount_type: "percentage", discount_value: 20 }),
        terms({ discount_type: "percentage", discount_value: 100 }),
        terms({ discount_type: "free_shipping", discount_value: 0 }),
        // A category on free delivery is ignored, as neither admin form sets one
        terms({ discount_type: "free_shipping", discount_value: 0, category_id: DRESSES }),
    ];

    test("every type matches computeDiscountSplit on every basket, to the pesewa", () => {
        for (const c of codes) {
            for (const b of baskets) {
                const subtotal = total(b.lines);
                const before = computeDiscountSplit({ discountType: c.discount_type, value: Number(c.discount_value), subtotal, deliveryFee: b.fee });
                expect(computeCouponSplit({ terms: c, subtotal, deliveryFee: b.fee, lines: b.lines })).toEqual(before);
                // ...and without lines at all, as an older page would send
                expect(computeCouponSplit({ terms: c, subtotal, deliveryFee: b.fee })).toEqual(before);
            }
        }
    });

    // Every live code on 21 Oct 2026 was a fixed amount with no category. These
    // are their values, and the goods-after-automatic-discounts and delivery fee
    // of the last 1000 orders (141 distinct pairs), read from production.
    const LIVE_FIXED_VALUES = [100, 80, 120, 1250, 1500, 150, 1000, 160, 320, 300, 1200, 200, 250, 140, 1400, 180, 710, 960, 650, 220, 400, 500, 315, 900, 350, 1450, 190, 750, 550];
    const REAL_CARTS = [[0,0],[10,0],[80,0],[80,35],[100,0],[100,20],[100,35],[120,0],[120,35],[130,0],[130,35],[150,0],[150,20],[150,35],[160,0],[160,20],[160,35],[180,0],[180,20],[180,35],[200,0],[200,20],[200,35],[220,0],[230,0],[230,35],[240,35],[250,0],[250,20],[250,35],[260,0],[260,35],[270,0],[270,20],[270,35],[280,0],[280,35],[290,0],[290,35],[300,0],[300,20],[300,35],[310,0],[310,35],[320,0],[320,35],[330,0],[330,35],[340,0],[340,20],[340,35],[350,0],[350,20],[350,35],[360,0],[360,35],[370,35],[380,0],[380,35],[400,0],[400,20],[400,35],[410,0],[410,35],[420,0],[430,0],[430,35],[440,0],[450,0],[450,20],[450,35],[460,0],[460,20],[470,0],[480,0],[480,35],[490,35],[500,0],[500,20],[500,35],[510,0],[510,35],[520,0],[520,35],[530,20],[550,0],[550,20],[550,35],[560,20],[560,35],[570,35],[580,0],[590,0],[600,0],[600,20],[600,35],[610,0],[610,35],[620,35],[630,0],[630,20],[640,0],[640,20],[640,35],[650,0],[650,35],[660,0],[660,35],[670,0],[680,0],[690,0],[690,20],[700,0],[700,35],[710,20],[710,35],[760,0],[760,35],[790,0],[790,20],[800,0],[840,0],[900,0],[920,0],[960,0],[970,0],[1000,0],[1010,0],[1030,0],[1090,35],[1140,0],[1200,0],[1300,0],[1770,0],[1940,0],[2000,0],[2140,0],[2200,0],[2270,0],[2590,0],[4000,0]];

    test("the live codes on real carts: the same amount as before, every time", () => {
        for (const value of LIVE_FIXED_VALUES) {
            const row = terms({ discount_type: "fixed", discount_value: value });
            for (const [subtotal, fee] of REAL_CARTS) {
                const before = computeDiscountSplit({ discountType: "fixed", value, subtotal, deliveryFee: fee });
                expect(computeCouponSplit({ terms: row, subtotal, deliveryFee: fee, lines: [line("p", subtotal, 1, [DRESSES])] })).toEqual(before);
                expect(splitAppliedCode({ discount_type: "fixed", discount_amount: before.amount, raw_value: value }, { subtotal, deliveryFee: fee, lines: [] })).toEqual(before);
            }
        }
    });

    test("the page-side re-split is the same function for them", () => {
        const s = splitAppliedCode({ discount_type: "fixed", discount_amount: 0, raw_value: 900 }, { subtotal: 670, deliveryFee: 35, lines: [] });
        expect(s).toEqual({ subtotalAmount: 670, deliveryAmount: 35, amount: 705 });
        // Gift cards too
        const g = splitAppliedCode({ discount_type: "gift_card", discount_amount: 0, raw_value: 100 }, { subtotal: 80, deliveryFee: 30, lines: [] });
        expect(g).toEqual(computeDiscountSplit({ discountType: "gift_card", value: 100, subtotal: 80, deliveryFee: 30 }));
    });

    test("labels for existing codes read exactly as before", () => {
        expect(couponLabel(terms({ discount_type: "fixed", discount_value: 50 }))).toBe("GH₵ 50.00 Off");
        expect(couponLabel(terms({ discount_type: "percentage", discount_value: "15" }))).toBe("15% Off");
        expect(couponLabel(terms({ discount_type: "free_shipping" }))).toBe("Free Shipping");
    });

    test("they are not item codes", () => {
        expect(isItemCoupon(terms({ discount_type: "fixed", discount_value: 50 }))).toBe(false);
        expect(isItemCoupon(terms({ discount_type: "percentage", discount_value: 10 }))).toBe(false);
        expect(isItemCoupon(terms({ discount_type: "free_shipping", category_id: DRESSES }))).toBe(false);
    });
});

test.describe("category codes", () => {
    const basket = [line("dress", 200, 1, [DRESSES]), line("top", 100, 2, [TOPS]), line("both", 50, 1, [TOPS, DRESSES])];

    test("category_id wins; target_category_id is read when it is empty", () => {
        expect(couponCategoryId(terms({ category_id: DRESSES, target_category_id: TOPS }))).toBe(DRESSES);
        expect(couponCategoryId(terms({ target_category_id: TOPS }))).toBe(TOPS);
        expect(couponCategoryId(terms({}))).toBeNull();
    });

    test("percentage comes off only the category's items", () => {
        const s = computeCouponSplit({ terms: terms({ discount_type: "percentage", discount_value: 10, category_id: DRESSES }), subtotal: 450, deliveryFee: 30, lines: basket });
        // 10% of 200 + 50, not of 450
        expect(s).toEqual({ amount: 25, subtotalAmount: 25, deliveryAmount: 0 });
    });

    test("fixed stops at what the category's items cost and never reaches delivery", () => {
        const s = computeCouponSplit({ terms: terms({ discount_type: "fixed", discount_value: 500, category_id: DRESSES }), subtotal: 450, deliveryFee: 30, lines: basket });
        expect(s).toEqual({ amount: 250, subtotalAmount: 250, deliveryAmount: 0 });
        const small = computeCouponSplit({ terms: terms({ discount_type: "fixed", discount_value: 40, category_id: TOPS }), subtotal: 450, deliveryFee: 30, lines: basket });
        expect(small.amount).toBe(40);
    });

    test("a line an automatic discount covers is left to the automatic discount", () => {
        const covered = [line("dress", 200, 1, [DRESSES], true), line("dress2", 80, 1, [DRESSES])];
        const s = computeCouponSplit({ terms: terms({ discount_type: "percentage", discount_value: 50, category_id: DRESSES }), subtotal: 280, deliveryFee: 0, lines: covered });
        expect(s.amount).toBe(40);
    });

    test("nothing in the category: worth nothing, with the reason", () => {
        const t = terms({ discount_type: "percentage", discount_value: 10, category_id: DRESSES });
        const lines = [line("top", 100, 1, [TOPS])];
        expect(computeCouponSplit({ terms: t, subtotal: 100, deliveryFee: 30, lines }).amount).toBe(0);
        const why = itemCouponShortfall(t, lines)!;
        expect(why.reason).toBe("no_items");
        expect(itemCouponShortfallText(why, t, "Dresses")).toBe("This code is for Dresses items only, and nothing in your cart qualifies.");
        const allCovered = itemCouponShortfall(t, [line("d", 100, 1, [DRESSES], true)])!;
        expect(allCovered.reason).toBe("covered");
    });

    test("labels name the category", () => {
        expect(couponLabel(terms({ discount_type: "percentage", discount_value: 20, category_id: DRESSES }), "Dresses")).toBe("20% Off Dresses");
        expect(couponLabel(terms({ discount_type: "fixed", discount_value: 30, category_id: DRESSES }), "Dresses")).toBe("GH₵ 30.00 Off Dresses");
    });
});

test.describe("buy X get Y", () => {
    const b2g1 = terms({ discount_type: "buy_x_get_y", buy_quantity: 2, get_quantity: 1 });

    test("buy 2 get 1: three of the same, one free", () => {
        expect(computeCouponSplit({ terms: b2g1, subtotal: 300, deliveryFee: 20, lines: [line("a", 100, 3)] })).toEqual({ amount: 100, subtotalAmount: 100, deliveryAmount: 0 });
    });

    test("mixed prices: the cheapest are the free ones", () => {
        const lines = [line("a", 150, 1), line("b", 90, 1), line("c", 60, 1)];
        expect(computeCouponSplit({ terms: b2g1, subtotal: 300, deliveryFee: 0, lines }).amount).toBe(60);
    });

    test("odd quantities: only complete groups count", () => {
        // 7 items, groups of 3 → 2 free, the two cheapest (10 and 20)
        const lines = [line("a", 100, 3), line("b", 20, 1), line("c", 10, 1), line("d", 50, 2)];
        expect(computeCouponSplit({ terms: b2g1, subtotal: 450, deliveryFee: 0, lines }).amount).toBe(30);
        // 2 items: not enough yet, and the customer is told how many more
        const two = [line("a", 100, 2)];
        expect(computeCouponSplit({ terms: b2g1, subtotal: 200, deliveryFee: 0, lines: two }).amount).toBe(0);
        const why = itemCouponShortfall(b2g1, two)!;
        expect(why).toEqual({ reason: "need_more", needed: 1 });
        expect(itemCouponShortfallText(why, b2g1)).toBe("Add 1 more qualifying item to use this code: buy 2, get 1 free.");
    });

    test("one line with several units can be split between paid and free", () => {
        // Buy 1 get 1, 4 units: 2 free, both from the cheaper line of 3
        const b1g1 = terms({ discount_type: "buy_x_get_y", buy_quantity: 1, get_quantity: 1 });
        expect(computeCouponSplit({ terms: b1g1, subtotal: 190, deliveryFee: 0, lines: [line("a", 100, 1), line("b", 30, 3)] }).amount).toBe(60);
    });

    test("respects the category and skips covered lines", () => {
        const t = terms({ discount_type: "buy_x_get_y", buy_quantity: 2, get_quantity: 1, category_id: DRESSES });
        const lines = [line("d1", 200, 2, [DRESSES]), line("t", 5, 5, [TOPS]), line("d2", 120, 1, [DRESSES]), line("d3", 10, 3, [DRESSES], true)];
        // Qualifying: 200, 200, 120 → one free, the 120. Tops and the covered dresses don't count.
        expect(computeCouponSplit({ terms: t, subtotal: 600, deliveryFee: 0, lines }).amount).toBe(120);
    });

    test("an incomplete code takes nothing off", () => {
        expect(computeCouponSplit({ terms: terms({ discount_type: "buy_x_get_y", buy_quantity: 2, get_quantity: null }), subtotal: 300, deliveryFee: 0, lines: [line("a", 100, 3)] }).amount).toBe(0);
        expect(computeCouponSplit({ terms: terms({ discount_type: "buy_x_get_y", buy_quantity: 0, get_quantity: 1 }), subtotal: 300, deliveryFee: 0, lines: [line("a", 100, 3)] }).amount).toBe(0);
    });

    test("label", () => {
        expect(couponLabel(b2g1)).toBe("Buy 2, Get 1 Free");
    });
});

test.describe("sale price", () => {
    const sale = terms({ discount_type: "sale_price", discount_value: 80 });

    test("every unit above the sale price comes down to it", () => {
        // 120 → 80 (40 off ×2), 100 → 80 (20 off), 60 stays
        const lines = [line("a", 120, 2), line("b", 100, 1), line("c", 60, 1)];
        expect(computeCouponSplit({ terms: sale, subtotal: 400, deliveryFee: 30, lines })).toEqual({ amount: 100, subtotalAmount: 100, deliveryAmount: 0 });
    });

    test("in a category, only that category's items", () => {
        const t = terms({ discount_type: "sale_price", discount_value: 80, category_id: DRESSES });
        const lines = [line("a", 120, 1, [DRESSES]), line("b", 200, 1, [TOPS])];
        expect(computeCouponSplit({ terms: t, subtotal: 320, deliveryFee: 0, lines }).amount).toBe(40);
    });

    test("everything already cheaper: nothing off, and the reason says so", () => {
        const lines = [line("c", 60, 2)];
        expect(computeCouponSplit({ terms: sale, subtotal: 120, deliveryFee: 0, lines }).amount).toBe(0);
        const why = itemCouponShortfall(sale, lines)!;
        expect(itemCouponShortfallText(why, sale)).toBe("Everything this code covers in your cart already costs GH₵ 80.00 or less.");
    });

    test("a sale price of zero is a broken row, not free goods", () => {
        expect(computeCouponSplit({ terms: terms({ discount_type: "sale_price", discount_value: 0 }), subtotal: 100, deliveryFee: 0, lines: [line("a", 100, 1)] }).amount).toBe(0);
    });

    test("label", () => {
        expect(couponLabel(sale)).toBe("Sale Price GH₵ 80.00");
        expect(couponLabel(terms({ discount_type: "sale_price", discount_value: 80, category_id: DRESSES }), "Dresses")).toBe("Sale Price GH₵ 80.00 on Dresses");
    });
});

test.describe("limits every item code respects", () => {
    const item: CouponTerms[] = [
        terms({ discount_type: "percentage", discount_value: 100, category_id: DRESSES }),
        terms({ discount_type: "fixed", discount_value: 10_000, category_id: DRESSES }),
        terms({ discount_type: "sale_price", discount_value: 0.01, category_id: DRESSES }),
        terms({ discount_type: "buy_x_get_y", buy_quantity: 1, get_quantity: 5, category_id: DRESSES }),
        terms({ discount_type: "sale_price", discount_value: 0.01 }),
        terms({ discount_type: "buy_x_get_y", buy_quantity: 1, get_quantity: 1 }),
    ];
    const lines = [line("a", 99.99, 3, [DRESSES]), line("b", 0.5, 1, [DRESSES]), line("c", 40, 1, [TOPS])];

    test("never below zero, never above the items they cover, never on delivery", () => {
        for (const t of item) {
            const covered = (t.category_id ? lines.filter(l => l.categoryIds!.includes(DRESSES)) : lines);
            const s = computeCouponSplit({ terms: t, subtotal: total(lines), deliveryFee: 45, lines });
            expect(s.amount).toBeGreaterThanOrEqual(0);
            expect(s.amount).toBeLessThanOrEqual(parseFloat(total(covered).toFixed(2)));
            expect(s.deliveryAmount).toBe(0);
            expect(s.amount).toBe(s.subtotalAmount);
            expect(Number.isInteger(Math.round(s.amount * 100))).toBe(true);
            expect(s.amount).toBe(parseFloat(s.amount.toFixed(2)));
        }
    });

    test("never more than the subtotal the charge path passes", () => {
        const s = computeCouponSplit({ terms: item[0], subtotal: 50, deliveryFee: 0, lines });
        expect(s.amount).toBe(50);
        expect(computeCouponSplit({ terms: item[0], subtotal: -5, deliveryFee: 0, lines }).amount).toBe(0);
    });

    test("no lines: worth nothing", () => {
        for (const t of item) expect(computeCouponSplit({ terms: t, subtotal: 100, deliveryFee: 10 }).amount).toBe(0);
    });

    test("bad lines are ignored, not counted", () => {
        const s = computeCouponSplit({
            terms: terms({ discount_type: "percentage", discount_value: 50, category_id: DRESSES }), subtotal: 100, deliveryFee: 0,
            lines: [line("a", 100, 1, [DRESSES]), line("neg", -50, 1, [DRESSES]), line("zero", 80, 0, [DRESSES]), line("nan", Number.NaN, 2, [DRESSES])],
        });
        expect(s.amount).toBe(50);
    });
});

test.describe("next to automatic discounts", () => {
    test("the checkout's split: auto first, then the code on what's left", () => {
        // An automatic discount covers the dress; the code is 50% off Dresses.
        const lines = [line("dress", 200, 1, [DRESSES], true), line("dress2", 100, 1, [DRESSES])];
        const afterAuto = 300 - 60; // the automatic discount took 60 off the first dress
        const s = computeCouponSplit({ terms: terms({ discount_type: "percentage", discount_value: 50, category_id: DRESSES }), subtotal: afterAuto, deliveryFee: 25, lines });
        expect(s.amount).toBe(50);
    });

    test("an existing whole-cart code still works off the goods after automatic discounts, as before", () => {
        const lines = [line("dress", 200, 1, [DRESSES], true), line("top", 100, 1, [TOPS])];
        const before = computeDiscountSplit({ discountType: "fixed", value: 250, subtotal: 240, deliveryFee: 25 });
        expect(computeCouponSplit({ terms: terms({ discount_type: "fixed", discount_value: 250 }), subtotal: 240, deliveryFee: 25, lines })).toEqual(before);
    });
});

test.describe("the pages", () => {
    test("an item code re-splits from its terms and the page's lines", () => {
        const applied = {
            discount_type: "percentage", discount_amount: 20, raw_value: 10,
            terms: terms({ discount_type: "percentage", discount_value: 10, category_id: DRESSES }),
            line_categories: { dress: [DRESSES], top: [TOPS] },
        };
        const s = splitAppliedCode(applied, { subtotal: 300, deliveryFee: 30, lines: [{ productId: "dress", unitPrice: 200, quantity: 1 }, { productId: "top", unitPrice: 100, quantity: 1 }] });
        expect(s.amount).toBe(20);
        // A product the server hasn't told the page about yet triggers a recheck
        expect(needsRecheck(applied, ["dress", "top"])).toBe(false);
        expect(needsRecheck(applied, ["dress", "new"])).toBe(true);
        expect(needsRecheck({ discount_type: "fixed", discount_amount: 10 }, ["anything"])).toBe(false);
    });

    test("category membership is products.category_ids, as automatic discounts use", () => {
        expect(productCategoryIds({ category_ids: [DRESSES, 5, null] })).toEqual([DRESSES]);
        expect(productCategoryIds({ category_ids: null })).toEqual([]);
        expect(productCategoryIds(undefined)).toEqual([]);
    });
});
