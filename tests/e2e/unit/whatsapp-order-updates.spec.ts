import { test, expect } from "@playwright/test";
import { sendOrderUpdate, STATUS_TEMPLATE, updateText, updateWording, ORDER_EVENTS, type UpdateDeps } from "../../../src/lib/whatsapp/orderUpdates";

const NOW = Date.parse("2026-10-14T21:00:00Z");
const ORDER = { id: "4a8ff381-0000-4000-8000-000000000000", customer_name: "Ama Mensah", customer_phone: "0200000001", delivery_method: "pickup" };

function deps(o: { enabled?: boolean; templateId?: number | null; lastInboundAt?: string | null; optedOut?: boolean; ok?: boolean } = {}) {
    const calls: string[] = [];
    const logged: string[] = [];
    const d: UpdateDeps = {
        enabled: o.enabled ?? true,
        templateId: o.templateId === undefined ? 4321 : o.templateId,
        conversationFor: async () => ({ id: "c1", optedOut: !!o.optedOut, lastInboundAt: o.lastInboundAt === undefined ? new Date(NOW - 3600_000).toISOString() : o.lastInboundAt }),
        sendText: async (to, text) => { calls.push(`text:${to}:${text}`); return o.ok === false ? { ok: false, code: "network" } : { ok: true, messageId: "wamid.U" }; },
        sendTemplate: async (to, id, ph) => { calls.push(`template:${to}:${id}:${ph.join("|")}`); return { ok: true, messageId: "wamid.T" }; },
        logOutbound: async (_c, text) => { logged.push(text); },
        now: () => NOW,
    };
    return { d, calls, logged };
}

test("each event reads as one plain sentence pair, with pickup and rider details", () => {
    expect(updateText("ready_for_pickup", ORDER, { store: "12 Oxford St\nOsu" })).toBe("Hi Ama, your Miss Tokyo order 4A8FF381 is ready for pickup. You can collect it from our store at 12 Oxford St, Osu.");
    expect(updateWording("shipped", ORDER, { rider: { name: "Kojo", phone: "0240000000" } }).next).toBe("Your rider Kojo will contact you on 0240000000.");
    expect(updateWording("paid", ORDER).next).toMatch(/ready for pickup/);
    expect(updateWording("paid", { ...ORDER, delivery_method: "delivery" }).next).toMatch(/on its way/);
    for (const e of ORDER_EVENTS) expect(updateText(e, ORDER)).not.toMatch(/cash|error|undefined|null/i);
});

test("inside the 24-hour window: a plain text, logged for the inbox", async () => {
    const { d, calls, logged } = deps();
    expect(await sendOrderUpdate(ORDER, "packed", {}, d)).toBe("sent_text");
    expect(calls).toEqual(["text:233200000001:Hi Ama, your Miss Tokyo order 4A8FF381 is packed. We'll message you when it's ready for pickup."]);
    expect(logged).toHaveLength(1);
});

test("outside the window: the approved template with name, ref and status, logged as sent", async () => {
    const { d, calls, logged } = deps({ lastInboundAt: null });
    expect(await sendOrderUpdate(ORDER, "fulfilled", {}, d)).toBe("sent_template");
    expect(logged).toEqual([STATUS_TEMPLATE("Ama", "4A8FF381", "delivered")]);
    expect(calls).toEqual(["template:233200000001:4321:Ama|4A8FF381|delivered"]);
    expect(STATUS_TEMPLATE("Ama", "4A8FF381", "delivered")).toBe("Hi Ama, this is an update on your Miss Tokyo order 4A8FF381.\n\nYour order is now delivered.\n\nIf you have any questions about your order, reply to this message and our team will help you.");
});

test("nothing is sent when off, opted out, without a number, or outside the window with no template", async () => {
    expect(await sendOrderUpdate(ORDER, "paid", {}, deps({ enabled: false }).d)).toBe("off");
    expect(await sendOrderUpdate(ORDER, "paid", {}, deps({ optedOut: true }).d)).toBe("opted_out");
    expect(await sendOrderUpdate({ ...ORDER, customer_phone: null }, "paid", {}, deps().d)).toBe("no_phone");
    const none = deps({ templateId: null, lastInboundAt: new Date(NOW - 25 * 3600_000).toISOString() });
    expect(await sendOrderUpdate(ORDER, "paid", {}, none.d)).toBe("no_template");
    expect(none.calls).toEqual([]);
});

test("a failed send is reported, never thrown, and not logged", async () => {
    const f = deps({ ok: false });
    expect(await sendOrderUpdate(ORDER, "paid", {}, f.d)).toBe("failed");
    expect(f.logged).toEqual([]);
    const boom = deps();
    boom.d.conversationFor = async () => { throw new Error("db down"); };
    expect(await sendOrderUpdate(ORDER, "paid", {}, boom.d)).toBe("failed");
});
