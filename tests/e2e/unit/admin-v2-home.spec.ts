import { test, expect } from "@playwright/test";
import {
    PERIOD_CTX, channelLabel, dateLine, greeting, inboxText, itemCount, kpiCtx, kpiDeltas, periodRange, readyText,
    shopDaysBetween, sinceText, startOfShopDay, toPackText, unpaidText,
} from "../../../src/lib/admin/v2/homeText";
import { NOT_TRACKED, isLow, lowRows, lowStockText, optionName, watchesStock, type StockProduct } from "../../../src/lib/admin/v2/lowStock";
import { needsRows, type NeedsData } from "../../../src/lib/admin/v2/homeNeeds";
import { applyReady, applyToPack, applyUnpaid } from "../../../src/lib/admin/v2/orderViews";
import { becomesReady } from "../../../src/lib/orders/readyRules";
import { activityText, orderRef } from "../../../src/lib/admin/activityText";
import { deltaPct } from "../../../src/components/admin/ui/format";

// Admin v2 Home: periods, deltas, low stock per variant, days waiting for
// collection, the "Needs you today" rows and the readable team activity.
// Pure: no database.

const at = (s: string) => new Date(s);

// ── Periods (Accra time) ─────────────────────────────────────────────────────
test("today runs from Accra midnight to now and compares with the same time yesterday", () => {
    const now = at("2026-10-21T14:30:00Z");
    const r = periodRange("today", now);
    expect(r.from.toISOString()).toBe("2026-10-21T00:00:00.000Z");
    expect(r.to.toISOString()).toBe("2026-10-21T14:30:00.000Z");
    expect(r.cmpFrom.toISOString()).toBe("2026-10-20T00:00:00.000Z");
    expect(r.cmpTo.toISOString()).toBe("2026-10-20T14:30:00.000Z");
});

test("7 and 30 days are today plus the days before, against the same stretch one period earlier", () => {
    const now = at("2026-10-21T09:05:00Z");
    const w = periodRange("7d", now);
    expect(w.from.toISOString()).toBe("2026-10-15T00:00:00.000Z");
    expect(w.cmpFrom.toISOString()).toBe("2026-10-08T00:00:00.000Z");
    expect(w.cmpTo.toISOString()).toBe("2026-10-14T09:05:00.000Z");
    const m = periodRange("30d", now);
    expect(m.from.toISOString()).toBe("2026-09-22T00:00:00.000Z");
    expect(m.cmpFrom.toISOString()).toBe("2026-08-23T00:00:00.000Z");
    expect(m.cmpTo.toISOString()).toBe("2026-09-21T09:05:00.000Z");
    for (const r of [w, m]) expect(r.to.getTime() - r.from.getTime()).toBe(r.cmpTo.getTime() - r.cmpFrom.getTime());
});

test("the shop day follows the shop's zone, not the server's", () => {
    // Just after midnight UTC is still the same Accra day; Tokyo is 9 h ahead.
    expect(startOfShopDay(at("2026-10-21T00:10:00Z")).toISOString()).toBe("2026-10-21T00:00:00.000Z");
    expect(startOfShopDay(at("2026-10-20T23:59:00Z")).toISOString()).toBe("2026-10-20T00:00:00.000Z");
    expect(startOfShopDay(at("2026-10-21T00:10:00Z"), "Asia/Tokyo").toISOString()).toBe("2026-10-20T15:00:00.000Z");
    expect(periodRange("today", at("2026-10-21T00:10:00Z"), "Asia/Tokyo").from.toISOString()).toBe("2026-10-20T15:00:00.000Z");
});

test("greeting and date line use Accra time", () => {
    expect(greeting(at("2026-10-21T08:00:00Z"))).toBe("Good morning");
    expect(greeting(at("2026-10-21T12:00:00Z"))).toBe("Good afternoon");
    expect(greeting(at("2026-10-21T17:00:00Z"))).toBe("Good evening");
    expect(greeting(at("2026-10-21T11:59:00Z"))).toBe("Good morning");
    expect(dateLine(at("2026-10-21T08:00:00Z"))).toBe("Wednesday 21 October");
});

// ── Delta maths ──────────────────────────────────────────────────────────────
test("deltas are whole percents against the earlier period, null when it had none", () => {
    expect(deltaPct(120, 100)).toBe(20);
    expect(deltaPct(80, 100)).toBe(-20);
    expect(deltaPct(100, 100)).toBe(0);
    expect(deltaPct(1, 3)).toBe(-67);
    expect(deltaPct(50, 0)).toBeNull();
    const cur = { sales: 3860, orders: 6, items: 9, aov: 643.33, cash: 630, cash_orders: 1 };
    const prev = { sales: 3112.9, orders: 5, items: 7, aov: 622.58, cash: 0, cash_orders: 0 };
    expect(kpiDeltas(cur, prev)).toEqual({ sales: 24, orders: 20, aov: 3 });
    expect(kpiDeltas(cur, null)).toEqual({ sales: null, orders: null, aov: null });
    expect(kpiDeltas(cur, { ...prev, sales: 0, orders: 0, aov: 0 })).toEqual({ sales: null, orders: null, aov: null });
});

test("a KPI without an arrow says why", () => {
    expect(kpiCtx("today", 12, 100)).toBe(PERIOD_CTX.today);
    expect(kpiCtx("today", null, 0)).toBe("none by this time yesterday");
    expect(kpiCtx("7d", null, 0)).toBe("none in the previous 7 days");
    expect(kpiCtx("30d", null, null)).toBe("vs previous 30 days");
});

// ── Low stock per variant (gap 8) ────────────────────────────────────────────
const P = (o: Partial<StockProduct> = {}): StockProduct => ({
    is_active: true, track_inventory: true, track_variant_inventory: true, preorder_enabled: false, inventory_count: 40, low_stock_at: 2, ...o,
});

test("only active, tracked products not taking pre-orders are watched", () => {
    expect(watchesStock(P())).toBe(true);
    expect(watchesStock(P({ is_active: false }))).toBe(false);
    expect(watchesStock(P({ track_inventory: false }))).toBe(false);
    expect(watchesStock(P({ preorder_enabled: true }))).toBe(false);
    expect(watchesStock(P({ track_inventory: null }))).toBe(true);
});

test("low means at or below the product's level; 9999 is never low; default level is 2", () => {
    expect(isLow(2, 2)).toBe(true);
    expect(isLow(3, 2)).toBe(false);
    expect(isLow(0, 0)).toBe(true);
    expect(isLow(1, 0)).toBe(false);
    expect(isLow(NOT_TRACKED, 10_000)).toBe(false);
    expect(isLow(2, null)).toBe(true);
    expect(isLow(null, 2)).toBe(true);
});

test("variant-tracked products count each size, never the roll-up (the old 15+ bug)", () => {
    // Roll-up 40 hid a sold-out size before.
    const v = [{ inventory_count: 0 }, { inventory_count: 2 }, { inventory_count: 3 }, { inventory_count: 38 }, { inventory_count: 1, visible: false }];
    expect(lowRows(P(), v).map(r => r.count)).toEqual([0, 2]);
    expect(lowRows(P({ low_stock_at: 3 }), v).map(r => r.count)).toEqual([0, 2, 3]);
    expect(lowRows(P({ preorder_enabled: true }), v)).toEqual([]);
    // No variant tracking: the product's one figure is one row.
    expect(lowRows(P({ track_variant_inventory: false, inventory_count: 1 }), v)).toEqual([{ variant: null, count: 1 }]);
    expect(lowRows(P({ track_variant_inventory: false, inventory_count: 9 }), v)).toEqual([]);
});

test("low stock sentence names the level and a real example", () => {
    const ex = { product_name: "Pink Off Shoulder Dress", size: "M", color: null, brand: null, inventory_count: 0, low_stock_at: 2 };
    expect(optionName(ex)).toBe("Pink Off Shoulder Dress in M");
    expect(optionName({ ...ex, color: "Pink" })).toBe("Pink Off Shoulder Dress in M / Pink");
    expect(lowStockText(9, 4, [2, 2], ex)).toBe("Counted per size and colour, at 2 or fewer. 4 are sold out. Pink Off Shoulder Dress in M is sold out.");
    expect(lowStockText(3, 0, [2, 5], { ...ex, inventory_count: 1 })).toBe("Counted per size and colour, at each product's warning level. Pink Off Shoulder Dress in M has 1 left.");
    expect(lowStockText(2, 2, [2], null)).toBe("Counted per size and colour, at 2 or fewer. All of them are sold out.");
});

// ── Days waiting for collection (gap 20) ─────────────────────────────────────
test("ready_at is set only on the way in to ready_for_pickup", () => {
    expect(becomesReady({ status: "packed", fulfillment_status: "packed" }, { status: "ready_for_pickup", fulfillment_status: "ready_for_pickup" })).toBe(true);
    expect(becomesReady({ status: "ready_for_pickup", fulfillment_status: "packed" }, { status: "ready_for_pickup" })).toBe(false);
    expect(becomesReady({ status: "packed", fulfillment_status: "ready_for_pickup" }, { fulfillment_status: "ready_for_pickup" })).toBe(false);
    expect(becomesReady(null, { fulfillment_status: "ready_for_pickup" })).toBe(true);
    expect(becomesReady(null, { status: "shipped" })).toBe(false);
});

test("days waiting count shop days and say so plainly", () => {
    const now = at("2026-10-21T10:00:00Z");
    expect(shopDaysBetween(at("2026-10-19T23:00:00Z"), now)).toBe(2);
    expect(readyText({ id: "1", ref: "4A8FF381", at: "2026-10-19T09:00:00Z" }, 1, 0, now)).toBe("#4A8FF381 has been waiting 2 days. Send the customer a reminder.");
    expect(readyText({ id: "1", ref: "4A8FF381", at: "2026-10-20T18:00:00Z" }, 1, 0, now)).toBe("#4A8FF381 has been waiting since yesterday. Send the customer a reminder.");
    expect(readyText({ id: "1", ref: "4A8FF381", at: "2026-10-21T08:00:00Z" }, 1, 0, now)).toBe("#4A8FF381 has been waiting since today. Send the customer a reminder.");
    expect(readyText({ id: "1", ref: "AB12CD34", at: "2026-10-11T09:00:00Z" }, 5, 2, now))
        .toBe("The longest wait is #AB12CD34, waiting 10 days. We don't know when 2 of them were marked ready. Send the customers a reminder.");
    // No reliable date: no number of days.
    expect(readyText({ id: "1", ref: "AB12CD34", at: null }, 1, 1, now)).toBe("#AB12CD34 is waiting to be collected. Send the customer a reminder.");
    expect(readyText({ id: "1", ref: "AB12CD34", at: null }, 3, 3, now)).toBe("Send the customers a reminder.");
});

// ── Other rows ───────────────────────────────────────────────────────────────
test("time since: minutes, hours, days, then a date", () => {
    const now = at("2026-10-21T12:00:00Z");
    expect(sinceText("2026-10-21T11:59:40Z", now)).toBe("just now");
    expect(sinceText("2026-10-21T11:10:00Z", now)).toBe("50 minutes ago");
    expect(sinceText("2026-10-21T11:00:00Z", now)).toBe("1 hour ago");
    expect(sinceText("2026-10-20T06:00:00Z", now)).toBe("30 hours ago");
    expect(sinceText("2026-10-15T06:00:00Z", now)).toBe("6 days ago");
    expect(sinceText("2026-03-24T06:36:17Z", now)).toBe("on 24 March");
    expect(sinceText("2025-12-24T06:36:17Z", now)).toBe("on 24 December 2025");
    expect(toPackText({ paid_at: "2026-10-21T11:10:00Z", created_at: "2026-10-21T11:08:00Z" }, now)).toBe("Paid and not packed yet. The oldest was paid 50 minutes ago.");
    expect(toPackText({ paid_at: null, created_at: "2026-10-21T11:08:00Z" }, now)).toBe("Paid and not packed yet. The oldest was placed 52 minutes ago.");
});

test("unpaid orders older than a day get the Paystack advice", () => {
    const now = at("2026-10-21T12:00:00Z");
    expect(unpaidText([], 0, now)).toBe("Checkouts from the last 24 hours that Paystack hasn't confirmed yet.");
    expect(unpaidText([{ id: "x", ref: "77EF8919", at: "2026-10-19T09:00:00Z" }], 1, now)).toBe("#77EF8919 has been unpaid for 2 days. Check it with Paystack before you cancel it.");
    expect(unpaidText([{ id: "x", ref: "77EF8919", at: "2026-10-20T09:00:00Z" }], 1, now)).toBe("#77EF8919 has been unpaid for 27 hours. Check it with Paystack before you cancel it.");
    expect(unpaidText([{ id: "x", ref: "77EF8919", at: "2026-10-19T09:00:00Z" }], 3, now)).toBe("3 orders have been unpaid for more than a day. Check them with Paystack before you cancel them.");
});

test("inbox sentence lists what's waiting", () => {
    expect(inboxText({ chats: 2, forms: 1, requests: 0, questions: 0 })).toBe("2 WhatsApp chats handed over by the assistant and 1 contact form not read yet.");
    expect(inboxText({ chats: 0, forms: 0, requests: 3, questions: 1 })).toBe("3 custom requests to answer and 1 question the assistant sent to admins.");
    expect(inboxText({ chats: 1, forms: 0, requests: 0, questions: 0 })).toBe("1 WhatsApp chat handed over by the assistant.");
});

test("channels and item counts", () => {
    expect(channelLabel("storefront", "paystack")).toBe("Online");
    expect(channelLabel("pos", "cash")).toBe("Till");
    expect(channelLabel("pos", "paystack")).toBe("Pay link");
    expect(channelLabel("whatsapp", "paystack")).toBe("WhatsApp");
    expect(channelLabel("web_chat", null)).toBe("Shop assistant");
    expect(itemCount([{ quantity: 2 }, { quantity: 1 }, {}])).toBe(4);
    expect(itemCount(null)).toBe(0);
});

const NEEDS: NeedsData = {
    toPack: { count: 0, oldest: null },
    unpaid: { count: 0, staleCount: 0, stale: [] },
    ready: { count: 0, undated: 0, oldest: null },
    inbox: { chats: 0, forms: 0, requests: 0, questions: 0, total: 0 },
    returns: { count: 0, orderId: null },
    lowStock: { count: 0, soldOut: 0, levels: [2], example: null },
    noPhoto: { count: 0, example: null },
};

test("nothing to do means no rows (the empty state)", () => {
    expect(needsRows(NEEDS, new Date())).toEqual([]);
});

test("each row links to the view its count comes from", () => {
    const now = at("2026-10-21T12:00:00Z");
    const rows = needsRows({
        ...NEEDS,
        toPack: { count: 15, oldest: { paid_at: null, created_at: "2026-03-24T06:36:17Z" } },
        ready: { count: 1, undated: 0, oldest: { id: "o1", ref: "4A8FF381", at: "2026-10-19T09:00:00Z" } },
        inbox: { chats: 1, forms: 12, requests: 0, questions: 0, total: 13 },
        lowStock: { count: 872, soldOut: 647, levels: [2], example: null },
        noPhoto: { count: 1, example: { name: "Adinkra Two-Piece Set", active: true } },
    }, now);
    expect(rows.map(r => [r.key, r.n, r.href])).toEqual([
        ["to-pack", 15, "/orders?view=to-pack"],
        ["ready", 1, "/orders/o1"],
        ["inbox", 13, "/inbox"],
        ["low-stock", 872, "/catalogue/inventory?view=low"],
        ["no-photo", 1, "/catalogue?view=nophoto"],
    ]);
    expect(rows[0].title).toBe("orders waiting to pack");
    expect(rows[0].body).toBe("Paid and not packed yet. The oldest was placed on 24 March.");
    expect(rows[1].title).toBe("order ready for collection");
    expect(rows[3].title).toBe("sizes are low or sold out");
    expect(rows[4].body).toBe("Adinkra Two-Piece Set is live in the shop without one.");
});

// ── Order view filters ───────────────────────────────────────────────────────
function recorder() {
    const calls: unknown[][] = [];
    const b: Record<string, (...a: unknown[]) => unknown> = {};
    for (const m of ["eq", "in", "not", "lt"]) b[m] = (...a: unknown[]) => { calls.push([m, ...a]); return b; };
    return { b, calls };
}

test("waiting to pack is exactly the side-nav Orders count", () => {
    const r = recorder();
    applyToPack(r.b);
    expect(r.calls).toEqual([
        ["eq", "payment_status", "paid"],
        ["in", "fulfillment_status", ["inbox", "processing"]],
        ["not", "status", "in", "(cancelled,refunded,fulfilled,delivered)"],
    ]);
    const u = recorder(); applyUnpaid(u.b);
    expect(u.calls).toEqual([["in", "payment_status", ["pending", "processing"]], ["not", "status", "in", "(cancelled,refunded,failed)"]]);
    const k = recorder(); applyReady(k.b);
    expect(k.calls).toEqual([["eq", "status", "ready_for_pickup"]]);
});

// ── Team activity in plain language ─────────────────────────────────────────
test("activity rows read as sentences, never codes", () => {
    const o = (action_type: string, details: Record<string, unknown>) => activityText({ action_type, resource: "order", resource_id: "4a8ff381-0000-4000-8000-000000000000", details });
    expect(o("PACKED_ORDER", { order_number: "4a8ff381", new_status: "packed" })).toEqual({ what: "packed order #4A8FF381", href: "/orders/4a8ff381-0000-4000-8000-000000000000" });
    expect(o("PACKED_ORDER", { order_number: "4a8ff381", new_status: "ready_for_pickup" }).what).toBe("marked order #4A8FF381 ready for collection");
    expect(o("DISPATCHED_ORDER", { order_number: "4a8ff381", rider_name: "Kofi" }).what).toBe("sent order #4A8FF381 out for delivery with Kofi");
    expect(o("UPDATE_STATUS", { order_number: "8677abf7", new_status: "delivered", new_fulfillment_status: "delivered" }).what).toBe("marked order #8677ABF7 as delivered");
    expect(o("UPDATE_STATUS", { order_number: "8677abf7", new_status: "paid", verified_against_paystack: true }).what).toBe("checked order #8677ABF7 with Paystack and marked it paid");
    expect(o("UPDATE_STATUS", { order_number: "8677abf7", new_status: "cancelled" }).what).toBe("cancelled order #8677ABF7");
    expect(o("CREATE", { order_number: "8677abf7", total: 450, via: "miss_tokyo_ai" }).what).toBe("created order #8677ABF7 for GH₵ 450.00 with Miss Tokyo AI");
    expect(activityText({ action_type: "CREATE", resource: "cash_sale", resource_id: "abc", details: { total: 594.5, orderRef: "8677ABF7", sessionId: "s1" } }).what)
        .toBe("took a cash sale of GH₵ 594.50 at the till (order #8677ABF7)");
    expect(activityText({ action_type: "UPDATE", resource: "product", resource_id: "p1", details: { resource_name: "Amazon pants" } })).toEqual({ what: "updated Amazon pants", href: "/catalogue/p1" });
    expect(activityText({ action_type: "CREATE", resource: "product", resource_id: "p1", details: { name: "Leather jacket " } }).what).toBe("added the product Leather jacket");
    expect(activityText({ action_type: "UPDATE", resource: "settings", resource_id: "seo", details: { section: "seo", changed: ["meta.keywords"] } }).what).toBe("changed Settings › Search engines");
    expect(activityText({ action_type: "CREATE_DISCOUNT", resource: "discount", details: { code: "MISST550" } }).what).toBe("created the discount code MISST550");
    expect(activityText({ action_type: "DELETE_DISCOUNT", resource: "discount", details: { code: "MISST1650" } }).what).toBe("deleted the discount code MISST1650");
    expect(activityText({ action_type: "REMOVE_MEMBER", resource: "team", details: {} }).what).toBe("removed someone from the team");
    expect(activityText({ action_type: "INVITE", resource: "team", details: { email: "a@b.co", role: "sales_staff" } }).what).toBe("invited a@b.co as sales staff");
    expect(activityText({ action_type: "UPDATE", resource: "rider", resource_id: "r1", details: { name: "Kofi", is_active: false } }).what).toBe("turned the rider Kofi off");
    expect(activityText({ action_type: "TOGGLE_AUTO_DISCOUNT", resource: "auto_discount", details: { title: "Weekend", is_active: true } }).what).toBe("turned the automatic discount Weekend on");
    // A gift card's code can be spent, so it never shows in the feed.
    const gc = activityText({ action_type: "CREATE", resource: "gift_card", details: { code: "BLCH-FUMX-F8T5-U7YS", value: 150 } }).what;
    expect(gc).toBe("issued a GH₵ 150.00 gift card");
    expect(gc).not.toContain("BLCH");
    expect(activityText({ action_type: "SOMETHING_NEW", resource: "widget", details: { resource_name: "Thing" } }).what).toBe("updated Thing");
    expect(orderRef({ action_type: "x", resource: "order", resource_id: "deadbeef-1", details: {} })).toBe("#DEADBEEF");
});
