import { test, expect } from "@playwright/test";
import {
    FALLBACK_TEXT, MAX_ATTEMPTS, processInboundEvent, REPLY_WINDOW_MS, REPROCESS_WINDOW_MS, RETRY_AFTER_MS, sweepInbound,
    type InboundEvent, type InboundMessage, type InboundStore, type ParsedInbound, type PipelineDeps,
} from "../../../src/lib/whatsapp/pipeline";

const NOW = new Date("2026-10-14T12:00:00Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();

/** In-memory stand-in for inbound_events, whatsapp_conversations and message_log. */
function fakeStore(events: Partial<InboundEvent>[]) {
    const ev = new Map(events.map((e, i) => {
        const id = e.id ?? `e${i}`;
        return [id, { id, provider: "chatbots_africa", raw_body: "{}", headers: {}, received_at: ago(60_000), attempts: 0, last_attempt_at: null, processed_at: null, gave_up_at: null, error: null as string | null, wa_phone: null as string | null, conversation_id: null as string | null, ...e }];
    }));
    const convs = new Map<string, { id: string; phone: string; last_inbound_at: string; handed_off_at: string | null; state: Record<string, unknown> }>();
    const logged: { conversationId: string; m: InboundMessage }[] = [];
    const store: InboundStore = {
        async claim(id, now) {
            const e = ev.get(id);
            if (!e || e.processed_at || e.gave_up_at || e.attempts >= MAX_ATTEMPTS) return null;
            if (e.last_attempt_at && now.getTime() - new Date(e.last_attempt_at).getTime() < RETRY_AFTER_MS) return null;
            e.attempts++; e.last_attempt_at = now.toISOString();
            return { ...e };
        },
        async touchConversation(phone, _name, receivedAt) {
            let c = [...convs.values()].find(x => x.phone === phone);
            if (!c) { c = { id: `c-${phone}`, phone, last_inbound_at: receivedAt, handed_off_at: null, state: {} }; convs.set(c.id, c); }
            if (c.last_inbound_at < receivedAt) c.last_inbound_at = receivedAt;
            return { id: c.id, handedOffAt: c.handed_off_at };
        },
        async seen(id) { return logged.some(l => l.m.messageId === id); },
        async logInbound(conversationId, m) { logged.push({ conversationId, m }); },
        async markProcessed(id, f) { Object.assign(ev.get(id)!, { processed_at: NOW.toISOString(), error: null, wa_phone: f.waPhone, conversation_id: f.conversationId }); },
        async markFailed(id, error, f) { Object.assign(ev.get(id)!, { error, wa_phone: f.waPhone, conversation_id: f.conversationId }); },
        async giveUp(id, error, f) { Object.assign(ev.get(id)!, { gave_up_at: NOW.toISOString(), error, wa_phone: f.waPhone, conversation_id: f.conversationId }); },
        async handOff(conversationId, reason, now) {
            const c = convs.get(conversationId)!;
            if (c.handed_off_at) return false;
            c.handed_off_at = now.toISOString(); c.state = { ...c.state, mode: "human", reason };
            return true;
        },
        async listPending(now, limit) {
            return [...ev.values()].filter(e => !e.processed_at && !e.gave_up_at && e.attempts < MAX_ATTEMPTS
                && now.getTime() - new Date(e.received_at).getTime() < REPROCESS_WINDOW_MS
                && (!e.last_attempt_at || now.getTime() - new Date(e.last_attempt_at).getTime() >= RETRY_AFTER_MS)).map(e => e.id).slice(0, limit);
        },
        async expireStale(now) {
            let n = 0;
            for (const e of ev.values()) if (!e.processed_at && !e.gave_up_at && now.getTime() - new Date(e.received_at).getTime() >= REPROCESS_WINDOW_MS) { e.gave_up_at = now.toISOString(); n++; }
            return n;
        },
    };
    return { store, ev, convs, logged };
}

const msg = (over: Partial<InboundMessage> = {}): InboundMessage => ({ messageId: "wamid.1", from: "233241234567", name: "Abena", type: "text", text: "Do you have this in M?", ...over });

function deps(store: InboundStore, opts: { parsed?: ParsedInbound; parseThrows?: boolean; handleThrows?: boolean } = {}) {
    const handled: InboundMessage[] = [];
    const fallbacks: string[] = [];
    const d: PipelineDeps = {
        store,
        parse: () => { if (opts.parseThrows) throw new Error("unreadable body"); return opts.parsed ?? { externalId: "evt-1", messages: [msg()] }; },
        handle: async m => { if (opts.handleThrows) throw new Error("model timeout"); handled.push(m); },
        sendFallback: async to => { fallbacks.push(to); return { ok: true, messageId: null }; },
        now: () => NOW,
    };
    return { d, handled, fallbacks };
}

test("a good event is handled once, logged after handling, and tracks last_inbound_at", async () => {
    const { store, ev, convs, logged } = fakeStore([{ id: "a", received_at: ago(5 * 60_000) }]);
    const { d, handled } = deps(store);
    expect(await processInboundEvent("a", d)).toBe("processed");
    expect(handled).toHaveLength(1);
    expect(logged).toHaveLength(1);
    expect(ev.get("a")).toMatchObject({ attempts: 1, wa_phone: "233241234567", conversation_id: "c-233241234567" });
    expect(ev.get("a")!.processed_at).not.toBeNull();
    expect(convs.get("c-233241234567")!.last_inbound_at).toBe(ago(5 * 60_000));
    // Done events are never claimed again.
    expect(await processInboundEvent("a", d)).toBe("skipped");
});

test("a replayed message id is not handled twice", async () => {
    const { store } = fakeStore([{ id: "a" }, { id: "b" }]);
    const { d, handled } = deps(store);
    await processInboundEvent("a", d);
    expect(await processInboundEvent("b", d)).toBe("processed");
    expect(handled).toHaveLength(1);
});

test("a conversation a person holds is logged and tracked, not answered by the bot", async () => {
    const { store, convs, logged } = fakeStore([{ id: "a" }]);
    convs.set("c-233241234567", { id: "c-233241234567", phone: "233241234567", last_inbound_at: ago(3600_000), handed_off_at: ago(3600_000), state: { mode: "human" } });
    const { d, handled } = deps(store);
    expect(await processInboundEvent("a", d)).toBe("processed");
    expect(handled).toHaveLength(0);
    expect(logged).toHaveLength(1);
    expect(convs.get("c-233241234567")!.last_inbound_at).toBe(ago(60_000));
});

test("a failure under the cap is kept for the sweep, and the window is still tracked", async () => {
    const { store, ev, convs, logged } = fakeStore([{ id: "a" }]);
    const { d, fallbacks } = deps(store, { handleThrows: true });
    expect(await processInboundEvent("a", d)).toBe("failed");
    expect(ev.get("a")).toMatchObject({ attempts: 1, error: "model timeout", processed_at: null, gave_up_at: null });
    expect(logged).toHaveLength(0);                      // not logged, so a retry handles it
    expect(convs.get("c-233241234567")!.handed_off_at).toBeNull();
    expect(fallbacks).toHaveLength(0);
    // Too soon for another try.
    expect(await processInboundEvent("a", d)).toBe("skipped");
});

test("at the cap: given up, handed to a person, one fallback note", async () => {
    const { store, ev, convs } = fakeStore([
        { id: "a", attempts: MAX_ATTEMPTS - 1, last_attempt_at: ago(RETRY_AFTER_MS) },
        { id: "b", attempts: MAX_ATTEMPTS - 1, last_attempt_at: ago(RETRY_AFTER_MS) },
    ]);
    const { d, fallbacks } = deps(store, { handleThrows: true, parsed: { externalId: null, messages: [msg({ messageId: null })] } });
    expect(await processInboundEvent("a", d)).toBe("gave_up");
    expect(ev.get("a")!.gave_up_at).not.toBeNull();
    expect(convs.get("c-233241234567")).toMatchObject({ state: { mode: "human", reason: "processing_failed" } });
    expect(fallbacks).toEqual(["233241234567"]);
    // The customer's next message now waits for the person: logged, not given to the bot, no second note.
    expect(await processInboundEvent("b", d)).toBe("processed");
    expect(fallbacks).toHaveLength(1);
    expect(FALLBACK_TEXT).not.toMatch(/cash|error|sorry/i);
});

test("no fallback note outside WhatsApp's 24-hour window", async () => {
    const { store, convs } = fakeStore([{ id: "a", received_at: ago(REPLY_WINDOW_MS + 60_000) }]);
    const { d, fallbacks } = deps(store, { handleThrows: true });
    expect(await processInboundEvent("a", d)).toBe("gave_up");     // past the reprocessing window too
    expect(convs.get("c-233241234567")!.handed_off_at).not.toBeNull();
    expect(fallbacks).toHaveLength(0);
});

test("an unreadable body at the cap is given up with no handoff (no sender known)", async () => {
    const { store, ev, convs } = fakeStore([{ id: "a", attempts: MAX_ATTEMPTS - 1 }]);
    const { d, fallbacks } = deps(store, { parseThrows: true });
    expect(await processInboundEvent("a", d)).toBe("gave_up");
    expect(ev.get("a")).toMatchObject({ error: "unreadable body", wa_phone: null });
    expect(convs.size).toBe(0);
    expect(fallbacks).toHaveLength(0);
});

test("the sweep retries what is due, skips what is too recent, and expires what aged out", async () => {
    const { store, ev } = fakeStore([
        { id: "due", attempts: 1, last_attempt_at: ago(RETRY_AFTER_MS + 1000), received_at: ago(3600_000) },
        { id: "recent", attempts: 1, last_attempt_at: ago(30_000), received_at: ago(3600_000) },
        { id: "never", received_at: ago(10 * 60_000) },
        { id: "old", received_at: ago(REPROCESS_WINDOW_MS + 60_000) },
        { id: "done", processed_at: ago(1000) },
    ]);
    const { d, handled } = deps(store, { parsed: { externalId: null, messages: [msg({ messageId: null })] } });
    const r = await sweepInbound(d, { limit: 25, budgetMs: 50_000 });
    expect(r).toMatchObject({ due: 2, processed: 2, expired: 1 });
    expect(handled).toHaveLength(2);
    expect(ev.get("recent")!.processed_at).toBeNull();
    expect(ev.get("old")!.gave_up_at).not.toBeNull();
    expect(ev.get("old")!.attempts).toBe(0);
});
