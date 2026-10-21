import { test, expect } from "@playwright/test";
import { canAnswerWaiting, handBackState, MAX_WAITING, MISSED_AFTER_MS, previewText, shapeConversation, waitingMessages, windowOpen, type ConversationRow } from "../../../src/lib/whatsapp/inbox";

const NOW = Date.parse("2026-10-14T18:00:00Z");
const row = (over: Partial<ConversationRow> = {}): ConversationRow => ({
    id: "c1", wa_phone_number: "233200000001", wa_contact_name: "Test Customer", state: {}, handed_off_at: null,
    last_message_at: "2026-10-14T17:59:00Z", last_inbound_at: "2026-10-14T17:59:00Z", created_at: "2026-10-14T17:00:00Z", ...over,
});

test("a chat shows who has it, why, and whether the 24-hour window is open", () => {
    const bot = shapeConversation(row(), null, NOW);
    expect(bot).toMatchObject({ mode: "assistant", reason: null, windowOpen: true, preview: null });
    const person = shapeConversation(row({ handed_off_at: "2026-10-14T17:59:30Z", state: { mode: "human", reason: "customer_asked" }, last_inbound_at: "2026-10-13T17:00:00Z" }), {
        id: "m1", conversation_id: "c1", direction: "inbound", content: "Can I speak to someone?", message_type: "text", created_at: "2026-10-14T17:59:00Z",
    }, NOW);
    expect(person).toMatchObject({ mode: "person", reason: "Asked for a person", windowOpen: false, preview: { direction: "inbound", text: "Can I speak to someone?" } });
});

test("previews are one line, capped, and name media", () => {
    expect(previewText({ content: "a\n\nb", message_type: "text" })).toBe("a b");
    expect(previewText({ content: null, message_type: "image" })).toBe("[image]");
    expect(previewText({ content: "x".repeat(200), message_type: "text" }).length).toBe(90);
    expect(windowOpen(null, NOW)).toBe(false);
});

test("handing back keeps the rest of the state", () => {
    expect(handBackState({ mode: "human", reason: "daily_limit", note: "keep" }, new Date(NOW)))
        .toEqual({ mode: "assistant", reason: null, since: "2026-10-14T18:00:00.000Z", note: "keep" });
});

// The 2026-10-20 chat: our handoff note, then a photo and "??" while a person had it.
const AT_2320 = Date.parse("2026-10-20T23:20:00Z");
const line = (direction: "inbound" | "outbound", at: string, id: string) => ({ direction, at, id });
const handedOff = [
    line("inbound", "2026-10-20T22:39:49Z", "do-you-have-this"),
    line("outbound", "2026-10-20T22:39:56Z", "handover-note"),
    line("inbound", "2026-10-20T23:05:16Z", "photo"),
    line("inbound", "2026-10-20T23:06:06Z", "??"),
];

test("waiting: the customer's messages after our last one, while WhatsApp still lets us reply", () => {
    expect(waitingMessages(handedOff, AT_2320).map(m => m.id)).toEqual(["photo", "??"]);
    expect(waitingMessages([...handedOff, line("outbound", "2026-10-20T23:07:00Z", "reply")], AT_2320)).toEqual([]);
    expect(waitingMessages([], AT_2320)).toEqual([]);
    expect(waitingMessages(handedOff, AT_2320 + 25 * 3600_000)).toEqual([]);   // window closed
    const many = Array.from({ length: 9 }, (_, i) => line("inbound", new Date(AT_2320 - (9 - i) * 1000).toISOString(), `m${i}`));
    expect(waitingMessages(many, AT_2320).map(m => m.id)).toEqual(many.slice(-MAX_WAITING).map(m => m.id));
});

test("staff are offered a reply: always while a person has the chat, else only once the assistant missed it", () => {
    const waiting = waitingMessages(handedOff, AT_2320);
    expect(canAnswerWaiting("person", waiting, AT_2320)).toBe(true);
    expect(canAnswerWaiting("assistant", waiting, AT_2320)).toBe(true);   // 14 minutes unanswered
    const fresh = [{ at: new Date(AT_2320 - MISSED_AFTER_MS + 5000).toISOString() }];
    expect(canAnswerWaiting("assistant", fresh, AT_2320)).toBe(false);   // it may be answering now
    expect(canAnswerWaiting("person", fresh, AT_2320)).toBe(true);
    expect(canAnswerWaiting("person", [], AT_2320)).toBe(false);
});
