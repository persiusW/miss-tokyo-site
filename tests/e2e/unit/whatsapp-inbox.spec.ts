import { test, expect } from "@playwright/test";
import { handBackState, previewText, shapeConversation, windowOpen, type ConversationRow } from "../../../src/lib/whatsapp/inbox";

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
