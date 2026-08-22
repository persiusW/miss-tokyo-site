import { test, expect } from "@playwright/test";
import { computeDiscountSplit } from "../../../src/lib/discountSplit";

// Delivery used to be added after the discount was subtracted, so no code could
// ever reach it. These lock in what each type is now allowed to touch.

test.describe("percentage", () => {
    test("takes its cut of the goods and never of the delivery fee", () => {
        const s = computeDiscountSplit({ discountType: "percentage", value: 20, subtotal: 100, deliveryFee: 30 });
        expect(s.subtotalAmount).toBe(20);
        expect(s.deliveryAmount).toBe(0);
        expect(s.amount).toBe(20);
    });

    test("100% off still leaves the delivery fee payable", () => {
        const s = computeDiscountSplit({ discountType: "percentage", value: 100, subtotal: 80, deliveryFee: 20 });
        expect(s.subtotalAmount).toBe(80);
        expect(s.deliveryAmount).toBe(0);
    });
});

test.describe("fixed", () => {
    test("stays on the goods while it fits", () => {
        const s = computeDiscountSplit({ discountType: "fixed", value: 50, subtotal: 100, deliveryFee: 30 });
        expect(s).toEqual({ subtotalAmount: 50, deliveryAmount: 0, amount: 50 });
    });

    test("spills the remainder onto delivery", () => {
        const s = computeDiscountSplit({ discountType: "fixed", value: 120, subtotal: 100, deliveryFee: 30 });
        expect(s).toEqual({ subtotalAmount: 100, deliveryAmount: 20, amount: 120 });
    });

    test("never exceeds goods plus delivery", () => {
        const s = computeDiscountSplit({ discountType: "fixed", value: 500, subtotal: 100, deliveryFee: 30 });
        expect(s).toEqual({ subtotalAmount: 100, deliveryAmount: 30, amount: 130 });
    });
});

test.describe("gift_card", () => {
    // The reported case: GHS 100 card, GHS 80 basket, GHS 20 delivery. This used
    // to cover the 80 and leave the customer paying 20 with 20 of card unspent.
    test("spends its remainder on delivery instead of discarding it", () => {
        const s = computeDiscountSplit({ discountType: "gift_card", value: 100, subtotal: 80, deliveryFee: 20 });
        expect(s).toEqual({ subtotalAmount: 80, deliveryAmount: 20, amount: 100 });
    });

    test("a card smaller than the basket behaves exactly as before", () => {
        const s = computeDiscountSplit({ discountType: "gift_card", value: 30, subtotal: 80, deliveryFee: 20 });
        expect(s).toEqual({ subtotalAmount: 30, deliveryAmount: 0, amount: 30 });
    });
});

test.describe("free_shipping", () => {
    test("waives exactly the delivery fee and nothing else", () => {
        const s = computeDiscountSplit({ discountType: "free_shipping", value: 0, subtotal: 100, deliveryFee: 30 });
        expect(s).toEqual({ subtotalAmount: 0, deliveryAmount: 30, amount: 30 });
    });

    test("is worth nothing on a pickup order", () => {
        const s = computeDiscountSplit({ discountType: "free_shipping", value: 0, subtotal: 100, deliveryFee: 0 });
        expect(s.amount).toBe(0);
    });
});

test.describe("edges", () => {
    test("bogo is settled by hand at dispatch, not here", () => {
        const s = computeDiscountSplit({ discountType: "bogo", value: 999, subtotal: 100, deliveryFee: 30 });
        expect(s).toEqual({ subtotalAmount: 0, deliveryAmount: 0, amount: 0 });
    });

    test("an unknown type is worth nothing rather than everything", () => {
        const s = computeDiscountSplit({ discountType: "sale_price", value: 999, subtotal: 100, deliveryFee: 30 });
        expect(s.amount).toBe(0);
    });

    test("an empty basket cannot produce a negative discount", () => {
        const s = computeDiscountSplit({ discountType: "fixed", value: 50, subtotal: 0, deliveryFee: 0 });
        expect(s).toEqual({ subtotalAmount: 0, deliveryAmount: 0, amount: 0 });
    });

    test("rounds to pesewas rather than trailing float noise", () => {
        const s = computeDiscountSplit({ discountType: "percentage", value: 15, subtotal: 33.33, deliveryFee: 0 });
        expect(s.subtotalAmount).toBe(5);
    });
});
