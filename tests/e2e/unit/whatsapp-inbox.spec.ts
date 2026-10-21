import { test, expect } from "@playwright/test";
import { canAnswerWaiting, eventLabel, handBackState, inTab, mediaKind, sortInbox, standingOf, tabCounts, waitingFor, waitingSince, wroteAgain, mediaPath, mediaState, MAX_WAITING, MISSED_AFTER_MS, previewText, shapeConversation, waitingMessages, windowOpen, type ConversationRow } from "../../../src/lib/whatsapp/inbox";

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

test("media: each kind shown its own way, kept under the chat by message id, never exposing the link", () => {
    expect(["image", "sticker", "audio", "voice", "video", "document", "text", "interactive", null].map(mediaKind))
        .toEqual(["photo", "photo", "audio", "audio", "video", "file", null, null, null]);
    expect(mediaPath("c1", "wamid.HBgM+/x==", "image/jpeg; charset=binary")).toBe("c1/wamid.HBgM__x__.jpg");
    expect(mediaPath("c1", "wamid.A", "audio/ogg")).toBe("c1/wamid.A.ogg");
    expect(mediaPath("c1", "wamid.A", null)).toBe("c1/wamid.A.bin");

    const row = (direction: "inbound" | "outbound", message_type: string | null, media_url: string | null) => ({ direction, message_type, media_url });
    expect(mediaState(row("inbound", "image", "storage:c1/wamid.A.jpg"))).toBe("ready");
    expect(mediaState(row("outbound", "image", "https://www.misstokyo.shop/api/whatsapp/media/product/p1"))).toBe("ready");
    expect(mediaState(row("inbound", "audio", null))).toBe("fetch");            // not copied yet: opening it copies it
    expect(mediaState(row("inbound", "image", "none:rejected"))).toBe("fetch"); // refused once: worth one more try on view
    expect(mediaState(row("inbound", "video", "none:invalid"))).toBe("missing"); // over 5 MB
    expect(mediaState(row("outbound", "image", null))).toBe("missing");         // an old product photo without its link
    expect(mediaState(row("inbound", "text", null))).toBe(null);
});

// ── Inbox v2: where a chat stands ─────────────────────────────────────────────
const T = (min: number) => new Date(Date.parse("2026-10-21T10:00:00Z") + min * 60_000).toISOString();
const chat = (o: { handed_off_at?: string | null; dealt_with_at?: string | null; last_inbound_at?: string | null }) => ({
    handed_off_at: o.handed_off_at ?? null, dealt_with_at: o.dealt_with_at ?? null, last_inbound_at: o.last_inbound_at === undefined ? T(0) : o.last_inbound_at,
});

test("standing: needs a person until dealt with; writing again reopens it; notices-only and assistant chats", () => {
    const handed = chat({ handed_off_at: T(5), last_inbound_at: T(4) });
    expect([standingOf(handed), waitingSince(handed), wroteAgain(handed)]).toEqual(["needs", T(5), false]);

    const dealt = chat({ handed_off_at: T(5), dealt_with_at: T(20), last_inbound_at: T(4) });
    expect([standingOf(dealt), waitingSince(dealt)]).toEqual(["dealt", null]);

    const again = chat({ handed_off_at: T(5), dealt_with_at: T(20), last_inbound_at: T(30) });
    expect([standingOf(again), waitingSince(again), wroteAgain(again)]).toEqual(["needs", T(30), true]);

    expect(standingOf(chat({ last_inbound_at: null }))).toBe("notices");   // only our order updates
    expect(standingOf(chat({}))).toBe("assistant");
});

test("the list: people waiting first, longest wait first; then newest; tabs and counts", () => {
    const c = (id: string, standing: "needs" | "dealt" | "assistant" | "notices", lastMessageAt: string, waitingSince: string | null = null) =>
        ({ id, standing, lastMessageAt, waitingSince });
    const list = [c("a", "assistant", T(50)), c("n1", "needs", T(10), T(9)), c("d", "dealt", T(60)), c("n0", "needs", T(40), T(1)), c("x", "notices", T(55))];
    expect(sortInbox(list).map(x => x.id)).toEqual(["n0", "n1", "d", "x", "a"]);
    expect(tabCounts(list)).toEqual({ all: 5, needs: 2, assistant: 1, notices: 1, dealt: 1 });
    expect(list.filter(x => inTab(x, "dealt")).map(x => x.id)).toEqual(["d"]);
    expect(list.filter(x => inTab(x, "all"))).toHaveLength(5);
});

test("waiting time and markers read plainly", () => {
    const now = Date.parse(T(0));
    expect(waitingFor(T(-0.2), now)).toBe("Waiting 1 min");
    expect(waitingFor(T(-59), now)).toBe("Waiting 59 min");
    expect(waitingFor(T(-125), now)).toBe("Waiting 2 h");
    expect(waitingFor(T(-60 * 72), now)).toBe("Waiting 3 days");
    expect(waitingFor(null, now)).toBe(null);
    expect(eventLabel({ kind: "handed_off", reason: "customer_asked", staff_name: null })).toBe("Handed to a person · Asked for a person");
    expect(eventLabel({ kind: "handed_off", reason: "made_up", staff_name: null })).toBe("Handed to a person");
    expect(eventLabel({ kind: "handed_back", reason: null, staff_name: "Ama" })).toBe("Handed back to the assistant by Ama");
    expect(eventLabel({ kind: "dealt_with", reason: null, staff_name: null })).toBe("Marked dealt with");
    expect(eventLabel({ kind: "auto_resumed", reason: null, staff_name: null })).toBe("Back with the assistant after 24 hours");
});
