import { test, expect } from "@playwright/test";
import { orderLines, planRefund, refundable, refundedSoFar, refundedUnits, stockTarget, planPack, unpackedUnits } from "../../../src/lib/orders/refundMath";
import { createPaystackRefund, refundEventOf } from "../../../src/lib/orders/paystackRefund";

// Refunds never call the live Paystack API in tests: every call below goes to
// a fake fetch that records what it was asked.

const ITEMS = [
    { productId: "p1", variantId: "v1", name: "Satin slip dress", size: "M", color: "Sage", quantity: 2, price: 450 },
    { productId: "p2", variantId: null, name: "Leather slides", size: "39", quantity: 6, price: 120 },
];
const lines = orderLines(ITEMS);
const TOTAL = 900 + 720 + 35; // items + delivery

test("lines keep their index, quantity, price and variant words", () => {
    expect(lines.map(l => [l.index, l.quantity, l.price, l.variant])).toEqual([[0, 2, 450, "M · Sage"], [1, 6, 120, "39"]]);
    expect(orderLines("nope")).toEqual([]);
    expect(orderLines([null, { name: "x", quantity: 0 }])[0]).toMatchObject({ index: 1, quantity: 1 });
});

test("refundable is the total less live refunds; failed ones don't count", () => {
    const rows = [{ amount_ghs: "100", status: "processed" }, { amount_ghs: 50, status: "failed" }, { amount_ghs: 20.1, status: "pending" }];
    expect(refundedSoFar(rows)).toBe(120.1);
    expect(refundable(TOTAL, rows)).toBe(1534.9);
    expect(refundable(10, [{ amount_ghs: 30, status: "recorded" }])).toBe(0);
});

test("full refund takes every unit not refunded yet and everything left", () => {
    const rows = [{ amount_ghs: 120, status: "processed", items: [{ index: 1, quantity: 1 }], restock: true }];
    const p = planRefund(TOTAL, lines, rows, { mode: "full" });
    expect(p).toEqual({ ok: true, amount: 1535, items: [{ index: 0, quantity: 2 }, { index: 1, quantity: 5 }], fully: true, left: 1535 });
});

test("item refunds are valued at the line price and capped by what's left", () => {
    const p = planRefund(TOTAL, lines, [], { mode: "items", items: [{ index: 1, quantity: 2 }] });
    expect(p).toMatchObject({ ok: true, amount: 240, fully: false });
    const capped = planRefund(300, lines, [{ amount_ghs: 100, status: "recorded" }], { mode: "items", items: [{ index: 0, quantity: 1 }] });
    expect(capped).toMatchObject({ ok: true, amount: 200, fully: true });
    expect(planRefund(TOTAL, lines, [], { mode: "items", items: [{ index: 0, quantity: 3 }] })).toMatchObject({ ok: false });
    expect(planRefund(TOTAL, lines, [], { mode: "items", items: [{ index: 7, quantity: 1 }] })).toMatchObject({ ok: false });
    expect(planRefund(TOTAL, lines, [], { mode: "items", items: [] })).toMatchObject({ ok: false });
    // Units refunded before can't be refunded again.
    const rows = [{ amount_ghs: 450, status: "processed", items: [{ index: 0, quantity: 2 }] }];
    expect(planRefund(TOTAL, lines, rows, { mode: "items", items: [{ index: 0, quantity: 1 }] })).toMatchObject({ ok: false, error: "Only 0 of Satin slip dress can still be refunded." });
});

test("an amount can never exceed what was charged minus earlier refunds", () => {
    expect(planRefund(TOTAL, lines, [], { mode: "amount", amount: "35" })).toMatchObject({ ok: true, amount: 35, items: [], fully: false });
    expect(planRefund(TOTAL, lines, [], { mode: "amount", amount: 1655.004 })).toMatchObject({ ok: true, amount: 1655, fully: true });
    expect(planRefund(TOTAL, lines, [], { mode: "amount", amount: 1655.01 })).toMatchObject({ ok: false, error: "You can refund up to GH₵ 1655.00 on this order." });
    expect(planRefund(TOTAL, lines, [], { mode: "amount", amount: 0 })).toMatchObject({ ok: false });
    expect(planRefund(TOTAL, lines, [], { mode: "amount", amount: "abc" })).toMatchObject({ ok: false });
    expect(planRefund(TOTAL, lines, [{ amount_ghs: TOTAL, status: "processed" }], { mode: "full" })).toEqual({ ok: false, error: "This order has nothing left to refund." });
});

test("stock target: no refunds keeps today's behaviour exactly", () => {
    expect(stockTarget(ITEMS, [], true)).toEqual({ items: ITEMS, hold: true });
    expect(stockTarget(ITEMS, [], false)).toEqual({ items: ITEMS, hold: false });
    expect(stockTarget(ITEMS, [{ amount_ghs: 10, status: "failed", items: [{ index: 0, quantity: 1 }], restock: true }], true).items).toBe(ITEMS);
});

test("stock target: restocked units stay back, written-off units never return", () => {
    const back = [{ amount_ghs: 240, status: "processed", items: [{ index: 1, quantity: 2 }], restock: true }];
    // Still holding: the order keeps 4 slides, so a later status change can't re-take the 2.
    expect(stockTarget(ITEMS, back, true).items.map(i => i.quantity)).toEqual([2, 4]);
    // Cancelled later: everything goes back (hold false, as before).
    expect(stockTarget(ITEMS, back, false)).toMatchObject({ hold: false });
    const gone = [{ amount_ghs: 450, status: "processed", items: [{ index: 0, quantity: 1 }], restock: false }];
    expect(stockTarget(ITEMS, gone, true).items.map(i => i.quantity)).toEqual([2, 6]);
    // Cancelled later: the damaged dress stays out of stock, the rest comes back.
    expect(stockTarget(ITEMS, gone, false)).toEqual({ items: [{ ...ITEMS[0], quantity: 1 }, { ...ITEMS[1], quantity: 0 }], hold: true });
    expect(refundedUnits(gone, false).get(0)).toBe(1);
});

test("partial packing: what's left, and when the last parcel finishes the order", () => {
    const parcels = [{ items: [{ index: 1, quantity: 2 }] }];
    expect([...unpackedUnits(lines, parcels).values()]).toEqual([2, 4]);
    expect(planPack(lines, parcels, [{ index: 0, quantity: 2 }])).toMatchObject({ ok: true, completes: false, units: 2, left: 4 });
    expect(planPack(lines, parcels, [{ index: 0, quantity: 2 }, { index: 1, quantity: 4 }])).toMatchObject({ ok: true, completes: true, left: 0 });
    expect(planPack(lines, parcels, [{ index: 1, quantity: 5 }])).toMatchObject({ ok: false });
    expect(planPack(lines, parcels, [{ index: 0, quantity: 0 }])).toMatchObject({ ok: false });
});

function fakeFetch(status: number, body: unknown, seen: { url?: string; init?: RequestInit }[] = []) {
    return (async (url: string, init?: RequestInit) => {
        seen.push({ url, init });
        return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
    }) as unknown as typeof fetch;
}

test("Paystack refund: sends the reference and pesewas, reads the refund id", async () => {
    const seen: { url?: string; init?: RequestInit }[] = [];
    const r = await createPaystackRefund({ reference: "T123", amountGhs: 240.5, note: "Wrong size" },
        { secret: "sk_test_x", fetchImpl: fakeFetch(200, { status: true, data: { id: 9911, status: "pending" } }, seen) });
    expect(r).toEqual({ ok: true, refundRef: "9911", status: "pending" });
    expect(seen[0].url).toBe("https://api.paystack.co/refund");
    expect(JSON.parse(String(seen[0].init?.body))).toEqual({ transaction: "T123", amount: 24050, currency: "GHS", merchant_note: "Wrong size" });
    expect((seen[0].init?.headers as Record<string, string>).Authorization).toBe("Bearer sk_test_x");
});

test("Paystack refund: refusals and outages come back as values, never throws", async () => {
    expect(await createPaystackRefund({ reference: "T1", amountGhs: 10 }, { secret: "", fetchImpl: fakeFetch(200, {}) })).toMatchObject({ ok: false, reason: "not_configured" });
    expect(await createPaystackRefund({ reference: "T1", amountGhs: 10 }, { secret: "k", fetchImpl: fakeFetch(400, { status: false, message: "Refund amount is greater than transaction amount" }) }))
        .toMatchObject({ ok: false, reason: "rejected" });
    expect(await createPaystackRefund({ reference: "T1", amountGhs: 10 }, { secret: "k", fetchImpl: fakeFetch(503, { status: false }) })).toMatchObject({ ok: false, reason: "unreachable" });
    const boom = (async () => { throw new Error("socket hang up"); }) as unknown as typeof fetch;
    expect(await createPaystackRefund({ reference: "T1", amountGhs: 10 }, { secret: "k", fetchImpl: boom })).toMatchObject({ ok: false, reason: "unreachable" });
    expect(await createPaystackRefund({ reference: "T1", amountGhs: 0 }, { secret: "k", fetchImpl: fakeFetch(200, {}) })).toMatchObject({ ok: false, reason: "rejected" });
});

test("refund webhook events are read, everything else is ignored", () => {
    expect(refundEventOf({ event: "refund.processed", data: { id: 77, transaction_reference: "T1", amount: 24050 } }))
        .toEqual({ status: "processed", refundRef: "77", reference: "T1", amountGhs: 240.5 });
    expect(refundEventOf({ event: "refund.failed", data: { transaction: { reference: "T2" } } })).toMatchObject({ status: "failed", reference: "T2", refundRef: null });
    expect(refundEventOf({ event: "charge.success", data: {} })).toBeNull();
    expect(refundEventOf(null)).toBeNull();
});
