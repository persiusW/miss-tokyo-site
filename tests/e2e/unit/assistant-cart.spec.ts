import { test, expect } from "@playwright/test";
import { addLine, cartFact, CART_TTL_MS, isFresh, lineLabel, MAX_CART_LINES, MAX_LINE_QTY, setQuantity, type CartLine } from "../../../src/lib/ai/shopAssistant/cartRules";

const P1 = "11111111-1111-4111-8111-111111111111";
const P2 = "22222222-2222-4222-8222-222222222222";
const line = (o: Partial<CartLine> = {}): CartLine => ({ product_id: P1, name: "Allure Tiered Halter Mini Dress", sku: "D13", size: "S", colour: "Brown", brand: null, quantity: 1, ...o });

test("the same piece in the same options adds up; another size or colour is its own line", () => {
    let r = addLine([], line());
    expect(r.ok && r.lines).toEqual([line()]);
    r = addLine(r.ok ? r.lines : [], line({ quantity: 2, colour: " brown " }));   // same option, any spacing or case
    expect(r.ok && r.lines.map(l => l.quantity)).toEqual([3]);
    r = addLine(r.ok ? r.lines : [], line({ size: "M" }));
    expect(r.ok && r.lines.length).toBe(2);
    r = addLine(r.ok ? r.lines : [], line({ product_id: P2, name: "The Tote Bag", sku: "H7", size: null, colour: null }));
    expect(r.ok && r.lines.map(lineLabel)).toEqual([
        "3× Allure Tiered Halter Mini Dress (SKU D13) · size S, Brown",
        "1× Allure Tiered Halter Mini Dress (SKU D13) · size M, Brown",
        "1× The Tote Bag (SKU H7)",
    ]);
});

test("limits: 20 different pieces, 20 of one piece", () => {
    const full = Array.from({ length: MAX_CART_LINES }, (_, i) => line({ size: `S${i}` }));
    const r = addLine(full, line({ size: "XL" }));
    expect(r.ok).toBe(false);
    const big = addLine([line({ quantity: 19 })], line({ quantity: 5 }));
    expect(big.ok && big.lines[0].quantity).toBe(MAX_LINE_QTY);
});

test("change or remove a piece; options left out match any", () => {
    const lines = [line(), line({ product_id: P2, name: "The Tote Bag", sku: "H7", size: null, colour: null })];
    const two = setQuantity(lines, { product_id: P1 }, 2);
    expect(two.ok && two.lines[0].quantity).toBe(2);
    const gone = setQuantity(lines, { product_id: P2 }, 0);
    expect(gone.ok && gone.lines.map(l => l.sku)).toEqual(["D13"]);
    expect(setQuantity(lines, { product_id: P1, size: "XL" }, 1).ok).toBe(false);
});

test("the basket shows in the facts every turn, and a day-old basket reads as empty", () => {
    expect(cartFact([])).toBe("- Their basket is empty.");
    expect(cartFact([line()])).toBe("- Their basket (from our records): 1× Allure Tiered Halter Mini Dress (SKU D13) · size S, Brown. Change it with update_cart; price and place it with from_cart true.");
    const now = Date.parse("2026-10-21T10:00:00Z");
    expect(isFresh(new Date(now - CART_TTL_MS + 60_000).toISOString(), now)).toBe(true);
    expect(isFresh(new Date(now - CART_TTL_MS - 1).toISOString(), now)).toBe(false);
    expect(isFresh(null, now)).toBe(false);
});
