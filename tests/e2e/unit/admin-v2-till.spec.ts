import { test, expect } from "@playwright/test";
import {
    addToCart, changeDue, chargedUnitPrice, codeFromReply, mmss, paidByLabel, parseSalesQuery, quickCash, saleProblem,
    saleStatusLabel, salesHref, salesRange, sendLinkBody, sessionBody, stockCheckItems, stockProblems, tillTotals,
    validateCodeBody, type SaleDraft,
} from "../../../src/lib/admin/v2/till";
import { splitAppliedCode } from "../../../src/lib/couponValue";
import { computeDiscountSplit } from "../../../src/lib/discountSplit";
import type { PosAppliedDiscount, PosItem } from "../../../src/types/pos";

// ── Copies of the money code the new till must agree with ────────────────────
// These are copied, not imported, on purpose: if either side changes, this test
// is where the two stop agreeing.

/** /api/pos/send-link: the amount it records on the order (and charges for a link). */
function sendLinkAmount(goods: number, deliveryFee: number, v: { subtotalAmount: number; deliveryAmount: number } | null, feePct: number) {
    const discountedSubtotal = parseFloat(Math.max(0, goods - (v?.subtotalAmount ?? 0)).toFixed(2));
    const payableDelivery = parseFloat(Math.max(0, deliveryFee - Math.min(v?.deliveryAmount ?? 0, deliveryFee)).toFixed(2));
    const platformFeeAmount = feePct > 0 ? parseFloat((discountedSubtotal * feePct / 100).toFixed(2)) : 0;
    return parseFloat((discountedSubtotal + platformFeeAmount + payableDelivery).toFixed(2));
}

/** The old till (pos/page.tsx): the amount on its buttons. It leaves the processing fee out. */
function oldTillTotal(cart: PosItem[], deliveryFee: number, applied: PosAppliedDiscount | null) {
    const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const codeLines = cart.map(i => ({ productId: i.productId, unitPrice: i.price, quantity: i.quantity }));
    const discountSplit = applied ? splitAppliedCode(applied, { subtotal: cartTotal, deliveryFee, lines: codeLines }) : { amount: 0, subtotalAmount: 0, deliveryAmount: 0 };
    const payableDelivery = parseFloat(Math.max(0, deliveryFee - discountSplit.deliveryAmount).toFixed(2));
    return parseFloat(Math.max(0, cartTotal - discountSplit.subtotalAmount + payableDelivery).toFixed(2));
}

const P = (n: number) => `0a1b2c3d-1111-2222-3333-${String(n).padStart(12, "0")}`;
const line = (n: number, price: number, quantity = 1, extra: Partial<PosItem> = {}): PosItem => ({
    productId: P(n), variantId: null, name: `Item ${n}`, size: "M", color: "Black", brand: null, price, quantity, ...extra,
});
const code = (discount_type: string, raw_value: number, type: "coupon" | "gift_card" = "coupon"): PosAppliedDiscount => ({
    code: "QA", type, discount_type, discount_amount: 0, raw_value, label: "QA", terms: null, line_categories: null,
});

const CARTS: PosItem[][] = [
    [line(1, 580)],
    [line(1, 150), line(2, 200, 2)],
    [line(1, 99.99, 3)],
    [line(1, 4000)],
    [line(1, 12.5), line(2, 0.35, 7), line(3, 333.33)],
];
const CODES: (PosAppliedDiscount | null)[] = [
    null, code("percentage", 10), code("percentage", 25), code("fixed", 50), code("fixed", 1000),
    code("free_shipping", 0), code("gift_card", 100, "gift_card"), code("gift_card", 10_000, "gift_card"),
];

test("the till's total is the amount send-link records, for every cart, code, delivery fee and fee setting", () => {
    let n = 0;
    for (const cart of CARTS) for (const applied of CODES) for (const deliveryFee of [0, 20, 35]) for (const feePct of [0, 2.5, 1.95]) {
        const goods = cart.reduce((s, i) => s + i.price * i.quantity, 0);
        const split = applied ? computeDiscountSplit({ discountType: applied.discount_type, value: applied.raw_value!, subtotal: goods, deliveryFee }) : null;
        const t = tillTotals({ cart, deliveryFee, applied, feePct });
        expect(t.total, JSON.stringify({ cart: cart.length, applied: applied?.discount_type, deliveryFee, feePct })).toBe(sendLinkAmount(goods, deliveryFee, split, feePct));
        n++;
    }
    expect(n).toBe(CARTS.length * CODES.length * 9);
});

test("with no processing fee the new till shows exactly the old till's amount", () => {
    for (const cart of CARTS) for (const applied of CODES) for (const deliveryFee of [0, 20, 35]) {
        expect(tillTotals({ cart, deliveryFee, applied, feePct: 0 }).total).toBe(oldTillTotal(cart, deliveryFee, applied));
    }
});

test("the processing fee is on the goods after the code, never on delivery (the 2026-10-20 cash sales)", () => {
    // Real till orders: 580 → 594.50, 200 + 35 delivery → 240, 4000 − 1000 → 3075.
    expect(tillTotals({ cart: [line(1, 580)], deliveryFee: 0, applied: null, feePct: 2.5 }).total).toBe(594.5);
    expect(tillTotals({ cart: [line(1, 200)], deliveryFee: 35, applied: null, feePct: 2.5 })).toMatchObject({ fee: 5, total: 240 });
    expect(tillTotals({ cart: [line(1, 4000)], deliveryFee: 0, applied: code("fixed", 1000), feePct: 2.5 }).total).toBe(3075);
    // A gift card that covers goods and delivery leaves nothing to collect, so the till must not ask for cash.
    expect(tillTotals({ cart: [line(1, 80)], deliveryFee: 20, applied: code("gift_card", 100, "gift_card"), feePct: 2.5 }).total).toBe(0);
});

test("the sale price is the one send-link charges", () => {
    expect(chargedUnitPrice({ price_ghs: 200 })).toBe(200);
    expect(chargedUnitPrice({ price_ghs: 200, is_sale: true, discount_value: 25 })).toBe(150);
    expect(chargedUnitPrice({ price_ghs: "200", is_sale: true, discount_value: 0 })).toBe(200);
    expect(chargedUnitPrice({ price_ghs: 200, is_sale: false, discount_value: 25 })).toBe(200);
});

const draft = (over: Partial<SaleDraft> = {}): SaleDraft => ({
    cart: [line(1, 150, 1, { brand: "Lv" })],
    customerMode: "new",
    contact: null,
    newCustomer: { name: "QA TEST", email: "qa-till@example.invalid" },
    phone: "",
    deliveryMethod: "pickup",
    address: "",
    country: "Ghana",
    region: "Greater Accra",
    zone: "accra",
    applied: null,
    notes: "",
    ...over,
});

/** pos/page.tsx's session body, copied. */
function oldSessionBody(d: SaleDraft) {
    const customer = d.customerMode === "search" ? d.contact! : d.newCustomer;
    return {
        customer_name: customer.name,
        customer_email: customer.email?.trim() || null,
        customer_phone: d.phone.trim() || null,
        customer_address: d.deliveryMethod === "delivery" ? d.address.trim() : null,
        customer_country: d.deliveryMethod === "delivery" ? d.country : null,
        customer_region: d.deliveryMethod === "delivery" ? d.region.trim() : null,
        contact_id: d.customerMode === "search" ? (d.contact?.id ?? undefined) : undefined,
        delivery_method: d.deliveryMethod,
        delivery_zone: d.deliveryMethod === "delivery" ? d.zone : null,
        discount_code: d.applied?.code ?? null,
        items: d.cart,
        notes: d.notes,
    };
}

test("the session body is the old till's, field for field, brand included", () => {
    const cases = [
        draft(),
        draft({ phone: " 0241234567 ", notes: "gift wrap" }),
        draft({ deliveryMethod: "delivery", address: " 12 Oxford St ", region: " Greater Accra ", zone: "accra", applied: code("fixed", 50) }),
        draft({ deliveryMethod: "delivery", address: "Kumasi", country: "Ghana", region: "Ashanti", zone: "outside" }),
        draft({ customerMode: "search", contact: { id: P(9), name: "Ama", email: null, phone: "0240000000" }, phone: "0240000000" }),
        draft({ customerMode: "search", contact: { id: null, name: "From an order", email: " a@b.c ", phone: null } }),
    ];
    for (const d of cases) {
        expect(JSON.parse(JSON.stringify(sessionBody(d)))).toEqual(JSON.parse(JSON.stringify(oldSessionBody(d))));
    }
    expect(sessionBody(cases[0]).items[0].brand).toBe("Lv");
    expect(sendLinkBody("s1", "cash", "k1")).toEqual({ sessionId: "s1", mode: "cash", saleKey: "k1" });
});

test("the stock check sends every variant dimension, as the old till does", () => {
    const cart = [line(1, 10, 2, { size: null, color: null, brand: "Coach" }), line(2, 5)];
    expect(JSON.parse(JSON.stringify(stockCheckItems(cart)))).toEqual([
        { productId: P(1), variantId: null, brand: "Coach", quantity: 2 },
        { productId: P(2), variantId: null, size: "M", color: "Black", quantity: 1 },
    ]);
    expect(stockProblems([{ isActive: true, preorderEnabled: false, available: 0 }, { isActive: true, preorderEnabled: false, available: 1 }],
        [line(1, 10, 1, { size: null, color: null, brand: "Coach" }), line(2, 5, 3)]))
        .toEqual([`"Item 1" (Coach) is sold out.`, `"Item 2" (M / Black) only has 1 left.`]);
    expect(stockProblems([{ isActive: true, preorderEnabled: true, available: 0 }], [line(1, 10)])).toEqual([]);
    expect(stockProblems([{ isActive: false }], [line(1, 10)])).toEqual([`"Item 1" is no longer available.`]);
});

test("validate-code gets the same body the old till sends", () => {
    const cart = [line(1, 150), line(2, 20, 3)];
    expect(validateCodeBody("SAVE", cart, 35, { email: "a@b.c" })).toEqual({
        code: "SAVE", subtotal: 210, deliveryFee: 35, email: "a@b.c", phone: null,
        items: [{ productId: P(1), unitPrice: 150, quantity: 1 }, { productId: P(2), unitPrice: 20, quantity: 3 }],
    });
    expect(codeFromReply({ valid: false })).toBe("Code not found or invalid.");
    expect(codeFromReply({ valid: true, code: "X", type: "gift_card", discount_type: "gift_card", discount_amount: "5", raw_value: "100" }))
        .toMatchObject({ code: "X", discount_amount: 5, raw_value: 100, label: "Discount applied" });
});

test("pre-send checks match the old till's, in its order", () => {
    expect(saleProblem(draft({ cart: [] }), "cash")).toMatch(/Add something/);
    expect(saleProblem(draft({ customerMode: "search" }), "cash")).toMatch(/Choose the customer/);
    expect(saleProblem(draft({ newCustomer: { name: " ", email: "" } }), "cash")).toMatch(/name/);
    expect(saleProblem(draft({ newCustomer: { name: "QA", email: "" } }), "cash")).toMatch(/phone number or email/);
    expect(saleProblem(draft(), "cash")).toBeNull();
    expect(saleProblem(draft(), "link")).toMatch(/pay link goes by text/);
    expect(saleProblem(draft({ phone: "024 12" }), "link")).toMatch(/incomplete/);
    expect(saleProblem(draft({ phone: "0241234567", deliveryMethod: "delivery" }), "link")).toMatch(/delivery address/);
    expect(saleProblem(draft({ phone: "0241234567" }), "link")).toBeNull();
});

test("adding the same pick twice adds a unit; another brand is another line", () => {
    const p = { id: P(1), name: "Purse", price: 300 };
    let cart = addToCart([], p, { size: null, color: null, brand: "Lv" });
    cart = addToCart(cart, p, { size: null, color: null, brand: "Lv" });
    cart = addToCart(cart, p, { size: null, color: null, brand: "MK" });
    expect(cart.map(i => [i.brand, i.quantity])).toEqual([["Lv", 2], ["MK", 1]]);
    expect(cart[0]).toEqual({ productId: P(1), variantId: null, name: "Purse", size: null, color: null, brand: "Lv", price: 300, quantity: 2 });
});

test("cash helpers", () => {
    expect(quickCash(594.5)).toEqual([600, 1000]);
    expect(quickCash(600)).toEqual([650, 700, 800]);
    expect(quickCash(240)).toEqual([250, 300, 400]);
    expect(changeDue(600, 594.5)).toBe(5.5);
    expect(changeDue(500, 594.5)).toBe(-94.5);
    expect(mmss(899_100)).toBe("15:00");
    expect(mmss(61_000)).toBe("1:01");
    expect(mmss(-5)).toBe("0:00");
});

test("Today's sales: URL state, Accra day bounds, labels", () => {
    const q = parseSalesQuery(new URLSearchParams("status=paid&staff=nope&page=2&q=ama"));
    expect(q).toMatchObject({ status: "paid", when: "today", staff: "", page: 2, q: "ama" });
    expect(parseSalesQuery({ from: "2026-10-01" }).when).toBe("dates");
    expect(salesHref(q, { status: "all" })).toBe("/till/today?q=ama");
    expect(salesHref({ ...q, when: "dates", from: "2026-10-01", to: "2026-10-02" })).toBe("/till/today?status=paid&when=dates&from=2026-10-01&to=2026-10-02&q=ama");
    const now = new Date("2026-10-21T23:30:00Z");
    expect(salesRange({ when: "today", from: "", to: "" }, now)).toEqual({ from: "2026-10-21T00:00:00.000Z", to: "2026-10-22T00:00:00.000Z" });
    expect(salesRange({ when: "7d", from: "", to: "" }, now).from).toBe("2026-10-15T00:00:00.000Z");
    expect(salesRange({ when: "dates", from: "2026-10-01", to: "2026-10-01" }, now)).toEqual({ from: "2026-10-01T00:00:00.000Z", to: "2026-10-02T00:00:00.000Z" });
    expect(salesRange({ when: "all", from: "", to: "" }, now)).toEqual({ from: null, to: null });
    expect(saleStatusLabel({ status: "pending_payment", expires_at: "2026-10-21T10:00:00Z" }, Date.parse("2026-10-21T11:00:00Z")).label).toBe("Expired");
    expect(saleStatusLabel({ status: "pending_payment", expires_at: "2026-10-21T12:00:00Z" }, Date.parse("2026-10-21T11:00:00Z")).label).toBe("Waiting for payment");
    expect(paidByLabel({ status: "paid", payment_method: "cash" })).toBe("Cash");
    expect(paidByLabel({ status: "paid" }, "gift_card")).toBe("Gift card");
    expect(paidByLabel({ status: "paid" }, "paystack")).toBe("Pay link");
    expect(paidByLabel({ status: "draft" })).toBe("—");
});
