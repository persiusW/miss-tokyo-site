import { test, expect } from "@playwright/test";
import {
    buildTimeline, canCancel, canRefund, filtersActive, nextStep, notificationText, orderIdFromPath, ordersSearch, parseOrdersQuery,
    payKeyOf, recoveredReminders, stepIndex, toCsv, unpaidFor,
} from "../../../src/lib/admin/v2/orders";

const ID = "4a8ff381-0000-4000-8000-000000000000";

test("the list's URL holds every filter, and old ?tab= bookmarks land on the same orders", () => {
    const q = parseOrdersQuery(new URLSearchParams("view=to-pack&q=ama&pay=cash&channel=pos&preorder=1&from=2026-10-01&to=bad&page=3"));
    expect(q).toEqual({ view: "to-pack", q: "ama", pay: "cash", channel: "pos", preorder: true, from: "2026-10-01", to: "", page: 3 });
    expect(ordersSearch(q)).toBe("?view=to-pack&q=ama&pay=cash&channel=pos&preorder=1&from=2026-10-01");
    expect(ordersSearch(q, { page: 2 })).toContain("page=2");
    expect(ordersSearch(parseOrdersQuery({}))).toBe("");
    expect(parseOrdersQuery({ tab: "packed", payment: "paystack" })).toMatchObject({ view: "packed", pay: "paystack" });
    expect(parseOrdersQuery({ tab: "all" }).view).toBe("to-pack");
    expect(parseOrdersQuery({ tab: "pickups" }).view).toBe("ready");
    expect(parseOrdersQuery({ tab: "all-orders" }).view).toBe("all");
    expect(parseOrdersQuery({ view: "nope" }).view).toBe("all");
    expect(filtersActive(parseOrdersQuery({ view: "packed" }))).toBe(false);
    expect(filtersActive(parseOrdersQuery({ preorder: "1" }))).toBe(true);
});

test("/orders/<id> opens the panel; other order pages don't", () => {
    expect(orderIdFromPath(`/orders/${ID}`)).toBe(ID);
    expect(orderIdFromPath("/orders/abandoned")).toBeNull();
    expect(orderIdFromPath("/orders/invoices")).toBeNull();
    expect(orderIdFromPath("/orders")).toBeNull();
});

const o = (p: Record<string, unknown>) => ({ id: ID, ...p });

test("one primary action per state", () => {
    expect(nextStep(o({ payment_status: "pending", status: "pending" }))).toBe("check");
    expect(nextStep(o({ payment_status: "paid", status: "paid", fulfillment_status: "inbox" }))).toBe("pack");
    expect(nextStep(o({ payment_status: "paid", status: "paid", fulfillment_status: "partial" }))).toBe("send-rest");
    expect(nextStep(o({ payment_status: "paid", status: "packed", fulfillment_status: "packed", delivery_method: "pickup" }))).toBe("ready");
    expect(nextStep(o({ payment_status: "paid", status: "packed", fulfillment_status: "packed", delivery_method: "delivery" }))).toBe("ship");
    expect(nextStep(o({ payment_status: "paid", status: "shipped", fulfillment_status: "packed" }))).toBe("delivered");
    expect(nextStep(o({ payment_status: "paid", status: "ready_for_pickup" }))).toBe("collected");
    expect(nextStep(o({ payment_status: "paid", status: "fulfilled", fulfillment_status: "packed" }))).toBeNull();
    expect(nextStep(o({ payment_status: "refunded", status: "refunded" }))).toBeNull();
    expect(nextStep(o({ payment_status: "cancelled", status: "cancelled" }))).toBeNull();
});

test("partly refunded is read from refunded_total; refund and cancel only where they make sense", () => {
    expect(payKeyOf(o({ payment_status: "paid", refunded_total: 20 }))).toBe("partly_refunded");
    expect(payKeyOf(o({ payment_status: "paid", refunded_total: "0" }))).toBe("paid");
    expect(canRefund(o({ payment_status: "paid", refunded_total: 20 }))).toBe(true);
    expect(canRefund(o({ payment_status: "pending" }))).toBe(false);
    expect(canCancel(o({ payment_status: "paid", status: "fulfilled" }))).toBe(false);
    expect(canCancel(o({ payment_status: "pending", status: "pending" }))).toBe(true);
    expect(canCancel(o({ payment_status: "refunded", status: "refunded" }))).toBe(false);
});

test("progress steps", () => {
    expect(stepIndex(o({ payment_status: "pending" }))).toBe(0);
    expect(stepIndex(o({ payment_status: "paid", fulfillment_status: "inbox" }))).toBe(1);
    expect(stepIndex(o({ payment_status: "paid", status: "shipped" }))).toBe(3);
    expect(stepIndex(o({ payment_status: "paid", status: "fulfilled" }))).toBe(4);
    expect(stepIndex(o({ payment_status: "cancelled", status: "cancelled" }))).toBe(-1);
});

test("unpaid banner only after a day", () => {
    const now = new Date("2026-10-21T12:00:00Z");
    expect(unpaidFor(o({ payment_status: "pending", created_at: "2026-10-21T08:00:00Z" }), now)).toBeNull();
    expect(unpaidFor(o({ payment_status: "pending", created_at: "2026-10-20T08:00:00Z" }), now)).toBe("Unpaid for a day");
    expect(unpaidFor(o({ payment_status: "pending", created_at: "2026-10-19T08:00:00Z" }), now)).toBe("Unpaid for 2 days");
    expect(unpaidFor(o({ payment_status: "paid", created_at: "2026-10-01T08:00:00Z" }), now)).toBeNull();
});

test("timeline merges every source, newest first, in plain words", () => {
    const items = buildTimeline({
        order: { created_at: "2026-10-20T10:00:00Z", paid_at: "2026-10-20T10:02:00Z", source: "storefront", total_amount: 461.25 },
        activity: [{ at: "2026-10-20T12:00:00Z", who: "Abena", what: "packed order #4A8FF381" }],
        notifications: [
            { created_at: "2026-10-20T10:03:00Z", channel: "email", event: "order_confirmed", status: "sent" },
            { created_at: "2026-10-20T13:00:00Z", channel: "whatsapp", event: "order_note", status: "sent", body: "Your rider will call" },
            { created_at: "2026-10-20T13:05:00Z", channel: "sms", event: "fulfillment:packed", status: "failed" },
        ],
        attempts: [{ created_at: "2026-10-20T10:01:00Z", status: "started", amount_ghs: 461.25 }],
        refunds: [{ created_at: "2026-10-21T09:00:00Z", amount_ghs: 120, method: "paystack", status: "failed", reason: "Wrong size", who: "Kojo", restock: true, units: 1 }],
        fulfilments: [{ created_at: "2026-10-20T11:00:00Z", units: 2, of: 6, who: "Abena" }],
    });
    expect(items.map(i => i.text)).toEqual([
        "Paystack couldn't complete the refund of GH₵ 120.00. Refund it in the Paystack dashboard.",
        "Kojo refunded GH₵ 120.00 through Paystack · Wrong size · 1 item back in stock",
        "Couldn't tell the customer by SMS that the order is being packed (it didn't go through)",
        "Note sent to the customer by WhatsApp: “Your rider will call”",
        "Abena packed order #4A8FF381",
        "Abena packed 2 of 6 items",
        "Order confirmation sent by email",
        "Payment of GH₵ 461.25 confirmed",
        "Payment started · GH₵ 461.25",
        "Order placed on the online shop",
    ]);
    expect(items[0].tone).toBe("danger");
    expect(notificationText({ created_at: "x", channel: "email", event: null, status: "sent" })).toBe("Message sent to the customer by email");
});

test("a reminder counts as recovered when the same email pays within 7 days", () => {
    const r = recoveredReminders(
        [
            { customer_email: "Ama@x.com", reminded_at: "2026-10-01T10:00:00Z" },
            { customer_email: "kofi@x.com", reminded_at: "2026-10-01T10:00:00Z" },
            { customer_email: "esi@x.com", reminded_at: "2026-10-01T10:00:00Z" },
            { customer_email: null, reminded_at: null },
        ],
        [
            { customer_email: "ama@x.com", created_at: "2026-10-03T10:00:00Z" },
            { customer_email: "ama@x.com", created_at: "2026-10-04T10:00:00Z" },
            { customer_email: "kofi@x.com", created_at: "2026-10-09T10:00:01Z" }, // 8 days later
            { customer_email: "esi@x.com", created_at: "2026-09-30T10:00:00Z" }, // before the reminder
        ],
    );
    expect(r).toEqual({ sent: 3, recovered: 1 });
});

test("CSV quotes and defuses formulas", () => {
    expect(toCsv([["a,b", '"q"', "=SUM(A1)", 3, null]])).toBe(`"a,b","""q""",'=SUM(A1),3,`);
});
