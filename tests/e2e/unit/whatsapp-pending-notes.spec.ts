import { test, expect } from "@playwright/test";
import type { ShopChat } from "../../../src/lib/ai/shopAssistant/types";
import { createWhatsAppHandler, type AssistantDeps } from "../../../src/lib/whatsapp/assistantHandler";
import { deliverPendingNotes, lateNoteChoice, NOTE_TTL_MS, queueLateNote, type DeliverDeps, type PendingNote, type QueueDeps } from "../../../src/lib/whatsapp/pendingNotes";
import type { InboundMessage } from "../../../src/lib/whatsapp/pipeline";
import { fillTemplate } from "../../../src/lib/whatsapp/templates";

const NOW = Date.parse("2026-10-29T12:00:00Z");

test("the template asks them to reply: the order's ref for an order note, else a plain follow-up", () => {
    expect(lateNoteChoice("order_note", "Ama", "4A8FF381")).toEqual({ key: "order_message_waiting", values: ["Ama", "4A8FF381"] });
    expect(lateNoteChoice("follow_up", "Ama")).toEqual({ key: "team_follow_up", values: ["Ama"] });
    expect(lateNoteChoice("order_note", "Ama", null).key).toBe("team_follow_up");
    expect(fillTemplate("order_message_waiting", ["Ama", "4A8FF381"])!.text).toContain("Reply to this message and we will send it to you here.");
});

function queue(o: { waiting?: number; ask?: Awaited<ReturnType<QueueDeps["ask"]>> } = {}) {
    const inserted: string[] = [];
    const removed: string[] = [];
    const asked: string[] = [];
    let since: Date | null = null;
    const deps: QueueDeps = {
        waiting: async (_c, s) => { since = s; return o.waiting ?? 0; },
        insert: async n => { inserted.push(n.body); return `n${inserted.length}`; },
        remove: async id => { removed.push(id); },
        ask: async c => { asked.push(c.key); return o.ask ?? "sent_template"; },
        now: () => NOW,
    };
    const run = (body = "Your dress is ready.") => queueLateNote({ conversationId: "c1", kind: "follow_up", body, staffId: "s1", staffName: "Efua", choice: lateNoteChoice("follow_up", "Ama") }, deps);
    return { run, inserted, removed, asked, since: () => since };
}

test("a late note is kept and the customer is asked to reply once; a second note waits with it", async () => {
    const first = queue();
    expect(await first.run()).toEqual({ ok: true, asked: true });
    expect(first.inserted).toEqual(["Your dress is ready."]);
    expect(first.asked).toEqual(["team_follow_up"]);
    expect(first.since()!.getTime()).toBe(NOW - NOTE_TTL_MS);

    const second = queue({ waiting: 1 });
    expect(await second.run("Also, it comes in black.")).toEqual({ ok: true, asked: false });
    expect(second.asked).toEqual([]);
});

test("when the ask can't go, the note is not kept and staff are told why", async () => {
    for (const [ask, status] of [["no_template", 409], ["opted_out", 409], ["off", 409], ["failed", 502], ["no_phone", 502]] as const) {
        const q = queue({ ask });
        const r = await q.run();
        expect(r).toMatchObject({ ok: false, status });
        expect(q.removed).toEqual(["n1"]);
    }
});

const note = (id: string, at: string, over: Partial<PendingNote> = {}): PendingNote =>
    ({ id, kind: "follow_up", body: `note ${id}`, orderId: null, staffId: "s1", staffName: "Efua", createdAt: at, ...over });

function deliver(notes: PendingNote[], failOn?: string) {
    const sent: string[] = [];
    const logged: string[] = [];
    const unclaimed: string[][] = [];
    const team: string[] = [];
    const deps: DeliverDeps = {
        claim: async () => notes,
        unclaim: async ids => { unclaimed.push(ids); },
        send: async (_p, n) => { if (n.id === failOn) return { ok: false, code: "network" }; sent.push(n.body); return { ok: true, messageId: `w-${n.id}` }; },
        log: async (_c, n, w) => { logged.push(`${n.body}:${w}`); },
        toTeam: async id => { team.push(id); },
        now: () => NOW,
    };
    return { run: () => deliverPendingNotes("c1", "233241234567", deps), sent, logged, unclaimed, team };
}

test("their reply delivers every waiting note in order, logs each, and gives the chat to the team", async () => {
    const d = deliver([note("a", "2026-10-28T09:00:00Z"), note("b", "2026-10-28T10:00:00Z")]);
    expect(await d.run()).toBe(2);
    expect(d.sent).toEqual(["note a", "note b"]);
    expect(d.logged).toEqual(["note a:w-a", "note b:w-b"]);
    expect(d.team).toEqual(["c1"]);
});

test("a failed send puts it and the rest back to wait; nothing waiting changes nothing", async () => {
    const d = deliver([note("a", "1"), note("b", "2"), note("c", "3")], "b");
    expect(await d.run()).toBe(1);
    expect(d.unclaimed).toEqual([["b", "c"]]);
    expect(d.team).toEqual(["c1"]);

    const none = deliver([], undefined);
    expect(await none.run()).toBe(0);
    expect(none.team).toEqual([]);
});

// ── In the WhatsApp handler ──────────────────────────────────────────────────

const chat = { id: "s1", visitorKey: "v", customerId: null, transcript: [], verifiedOrders: [], openOrders: [], payLinks: {}, saleKey: null, wrongTries: 0, lastQuote: null, turns: 0 } as ShopChat;
const msg = (text: string): InboundMessage => ({ messageId: "wamid.T", from: "233241234567", name: "Ama", type: "text", text });

function handler(delivered: number | "throws", quiet = false) {
    const runs: string[] = [];
    const deliveries: string[] = [];
    const optOuts: boolean[] = [];
    const deps: AssistantDeps = {
        send: async () => ({ ok: true, messageId: "w" }),
        sendImage: async () => ({ ok: true, messageId: "w" }),
        sendChoices: async () => ({ ok: true, messageId: "w" }),
        offered: async () => [],
        notice: async () => null,
        handOff: async () => true,
        logOutbound: async () => {},
        chatFor: async () => ({ chat, customerId: null }),
        counts: async () => ({ lastMinute: 0, today: 0 }),
        setOptOut: async (_id, out) => { optOuts.push(out); },
        quoted: async () => null,
        perDay: 20,
        fetchPhoto: async () => null,
        run: async a => { runs.push(a.text); return { reply: "Hello!", buttons: [], chat, failed: false }; },
        deliverNotes: async (c, phone) => { deliveries.push(`${c.id}:${phone}`); if (delivered === "throws") throw new Error("db down"); return delivered; },
        siteUrl: "https://misstokyo.shop",
    };
    const conv = { id: "c1", handedOffAt: null, ...(quiet ? { quiet: true } : {}) };
    return { handle: (t: string) => createWhatsAppHandler(deps)(msg(t), conv as never), runs, deliveries, optOuts };
}

test("a delivered note answers their message: the assistant stays out of it", async () => {
    const h = handler(1);
    await h.handle("Hi, what's the message?");
    expect(h.deliveries).toEqual(["c1:233241234567"]);
    expect(h.runs).toEqual([]);
});

test("nothing waiting, or a failure checking, and the assistant answers as usual; quiet chats still get their note", async () => {
    const none = handler(0);
    await none.handle("Hi");
    expect(none.runs).toEqual(["Hi"]);

    const broken = handler("throws");
    await broken.handle("Hi");
    expect(broken.runs).toEqual(["Hi"]);

    const quiet = handler(1, true);
    await quiet.handle("Hi");
    expect(quiet.deliveries).toHaveLength(1);
});

test("STOP is never answered with a waiting note", async () => {
    const h = handler(1);
    await h.handle("STOP");
    expect(h.deliveries).toEqual([]);
    expect(h.optOuts).toEqual([true]);
});
