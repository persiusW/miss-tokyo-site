import { test, expect } from "@playwright/test";
import { NOTICE_TYPE, unseenNotice, withNotice } from "../../../src/lib/whatsapp/notices";
import { nudgeText, runUnpaidNudges, type NudgeConversation, type NudgeDeps, type NudgeOrder } from "../../../src/lib/whatsapp/unpaidNudge";

// Fake numbers (2332000000xx) only.
const NOW = Date.parse("2026-10-16T12:00:00Z");
const ago = (min: number) => new Date(NOW - min * 60_000).toISOString();
const order = (over: Partial<NudgeOrder> = {}): NudgeOrder => ({ id: "4a8ff381-0000-4000-8000-000000000001", customer_name: "Ama Mensah", customer_phone: "0200000001", created_at: ago(40), ...over });
const chatting: NudgeConversation = { id: "c1", optedOut: false, handedOff: false, lastInboundAt: ago(45) };

function deps(o: { orders?: NudgeOrder[]; conv?: NudgeConversation | null; claimed?: Set<string>; again?: boolean; sendOk?: boolean } = {}) {
    const sent: [string, string][] = [];
    const logged: [string, string, string | undefined][] = [];
    const windows: [string, string][] = [];
    const claimed = o.claimed ?? new Set<string>();
    const d: NudgeDeps = {
        candidates: async (from, to) => { windows.push([from.toISOString(), to.toISOString()]); return o.orders ?? [order()]; },
        claim: async id => { if (claimed.has(id)) return false; claimed.add(id); return true; },
        conversation: async () => (o.conv === undefined ? chatting : o.conv),
        orderedSince: async () => !!o.again,
        sendText: async (to, text) => { sent.push([to, text]); return o.sendOk === false ? { ok: false, code: "network" } : { ok: true, messageId: "wamid.NUDGE" }; },
        logOutbound: async (c, text, _id, type) => { logged.push([c, text, type]); },
        now: () => NOW,
    };
    return { d, sent, logged, windows, claimed };
}

test("an unpaid WhatsApp order 30 to 60 minutes old gets one reminder, logged as a notice", async () => {
    const h = deps();
    expect(await runUnpaidNudges(h.d)).toEqual({ sent: 1 });
    expect(h.windows).toEqual([[ago(60), ago(30)]]);
    expect(h.sent).toEqual([["233200000001", nudgeText(order())]]);
    expect(nudgeText(order())).toMatch(/^Hi Ama, your Miss Tokyo order 4A8FF381 wasn't paid, so we've released the items\. .*new Pay now link/);
    expect(h.logged).toEqual([["c1", nudgeText(order()), NOTICE_TYPE]]);
    // A second run finds it claimed.
    expect(await runUnpaidNudges(h.d)).toEqual({ claimed_elsewhere: 1 });
    expect(h.sent).toHaveLength(1);
});

test("never sent: STOP, a person on the chat, outside the window, no chat, ordered again, no phone", async () => {
    const cases: [Parameters<typeof deps>[0], string][] = [
        [{ conv: { ...chatting, optedOut: true } }, "opted_out"],
        [{ conv: { ...chatting, handedOff: true } }, "with_person"],
        [{ conv: { ...chatting, lastInboundAt: ago(23.6 * 60) } }, "outside_window"],
        [{ conv: { ...chatting, lastInboundAt: null } }, "outside_window"],
        [{ conv: null }, "no_chat"],
        [{ again: true }, "ordered_again"],
        [{ orders: [order({ customer_phone: "12" })] }, "no_phone"],
    ];
    for (const [o, outcome] of cases) {
        const h = deps(o);
        expect(await runUnpaidNudges(h.d), outcome).toEqual({ [outcome]: 1 });
        expect(h.sent, outcome).toEqual([]);
    }
});

test("a failed send is counted and not retried; one order's error doesn't stop the rest", async () => {
    const failed = deps({ sendOk: false });
    expect(await runUnpaidNudges(failed.d)).toEqual({ failed: 1 });
    expect([failed.logged, [...failed.claimed]]).toEqual([[], [order().id]]);
    const h = deps({ orders: [order({ id: "boom" }), order({ id: "ok-order", customer_name: null })] });
    h.d.conversation = async phone => { if (h.claimed.has("boom") && !h.claimed.has("ok-order")) throw new Error("db"); return chatting; };
    expect(await runUnpaidNudges(h.d)).toEqual({ failed: 1, sent: 1 });
    expect(h.sent[0][1]).toMatch(/^Hi there, /);
});

test("the notice the customer is answering: our last message, only if it was a notice", () => {
    const inbound = { direction: "inbound", message_type: "text", content: "yes please" };
    const note = { direction: "outbound", message_type: NOTICE_TYPE, content: 'Hi Ama, your order\n4A8FF381 "wasn\'t" paid' };
    const reply = { direction: "outbound", message_type: "text", content: "Sure" };
    expect(unseenNotice([note, reply])).toBe("Hi Ama, your order 4A8FF381 'wasn't' paid");
    expect(unseenNotice([inbound, inbound, note])).toBe("Hi Ama, your order 4A8FF381 'wasn't' paid");
    expect(unseenNotice([reply, note])).toBe(null);
    expect(unseenNotice([inbound])).toBe(null);
    expect(unseenNotice([{ ...note, content: "x".repeat(400) }])).toHaveLength(300);
    expect(withNotice("N", "yes")).toBe('[We messaged you: "N"]\nyes');
});
