import { test, expect } from "@playwright/test";
import { RETURNS_PROMPT_NOTE, systemPromptFor } from "../../../src/lib/ai/shopAssistant/prompt";
import { CUSTOMER_TOOL_DEFS, OPTIONAL_TOOL_NAMES, START_RETURN_TOOL } from "../../../src/lib/ai/shopAssistant/toolDefs";
import type { ShopChat } from "../../../src/lib/ai/shopAssistant/types";
import { createWhatsAppHandler, type AssistantDeps } from "../../../src/lib/whatsapp/assistantHandler";
import { buildHandoffMessages } from "../../../src/lib/whatsapp/handoff";
import { shapeConversation } from "../../../src/lib/whatsapp/inbox";
import type { InboundMessage } from "../../../src/lib/whatsapp/pipeline";
import { RETURN_REASONS, RETURN_WANTS, returnable, returnSummary } from "../../../src/lib/whatsapp/returns";

// Fake numbers (2332000000xx) only.
test("only a paid order that reached the customer is returnable", () => {
    expect(returnable({ status: "fulfilled", payment_status: "paid" })).toBe(true);
    expect(returnable({ status: "delivered", payment_status: "paid" })).toBe(true);
    expect(returnable({ status: "shipped", payment_status: "paid" })).toBe(false);
    expect(returnable({ status: "fulfilled", payment_status: "pending" })).toBe(false);
    expect(returnable({ status: "cancelled", payment_status: "refunded" })).toBe(false);
});

test("the team's summary names the order, reason, wish, their words and the last update", () => {
    expect(returnSummary({ ref: "4A8FF381", reason: "wrong_size", wants: "exchange", details: 'Too  "small"\nin the hips', lastUpdate: "2026-10-15T09:00:00Z" }))
        .toBe("Return request for order 4A8FF381: wrong size; wants an exchange. They said: \"Too 'small' in the hips\". Order last updated 2026-10-15.");
    expect(returnSummary({ ref: "4A8FF381", reason: "faulty", wants: "unsure", details: null, lastUpdate: null }))
        .toBe("Return request for order 4A8FF381: faulty or damaged; wants not sure yet.");
});

test("start_return is optional, WhatsApp only, and its enums match the table's", () => {
    expect(CUSTOMER_TOOL_DEFS.map(t => t.name)).not.toContain("start_return");
    expect(OPTIONAL_TOOL_NAMES).toContain(START_RETURN_TOOL.name);
    const props = (START_RETURN_TOOL.input_schema as any).properties;
    expect(props.reason.enum).toEqual([...RETURN_REASONS]);
    expect(props.wants.enum).toEqual([...RETURN_WANTS]);
    expect(systemPromptFor("whatsapp", null, { returns: true })).toContain(RETURNS_PROMPT_NOTE);
    expect(RETURNS_PROMPT_NOTE).not.toMatch(/cash refund(?!s)/i);
});

test("the team's message carries the return note; the inbox labels it", () => {
    const m = buildHandoffMessages({ name: "Ama", phone: "233200000001", reason: "return_request", history: [], inboxUrl: "https://x/c", note: "Return request for order 4A8FF381: faulty or damaged; wants an exchange." });
    expect(m.whatsapp).toContain("wants to return or exchange an order.\n\nReturn request for order 4A8FF381");
    const c = shapeConversation({ id: "c1", wa_phone_number: "233200000001", wa_contact_name: null, handed_off_at: "2026-10-16T10:00:00Z", state: { mode: "human", reason: "return_request" }, last_inbound_at: "2026-10-16T09:59:00Z", last_message_at: null } as any, null, Date.parse("2026-10-16T10:05:00Z"));
    expect(c.reason).toBe("Return or exchange");
});

test("a turn that started a return hands the chat over with that reason", async () => {
    const chat = { id: "s1", visitorKey: "v", customerId: null, transcript: [], verifiedOrders: [], openOrders: [], payLinks: {}, saleKey: null, wrongTries: 0, lastQuote: null, turns: 0 } as ShopChat;
    const handoffs: string[] = [];
    const deps: AssistantDeps = {
        send: async () => ({ ok: true, messageId: "w" }), sendImage: async () => ({ ok: true, messageId: "w" }),
        sendChoices: async () => ({ ok: true, messageId: "w" }), offered: async () => [], notice: async () => null,
        handOff: async (_id, reason) => { handoffs.push(reason); return true; }, logOutbound: async () => {},
        chatFor: async () => ({ chat, customerId: null }), counts: async () => ({ lastMinute: 0, today: 0 }),
        setOptOut: async () => {}, quoted: async () => null, perDay: 20, fetchPhoto: async () => null, siteUrl: "https://misstokyo.shop",
        run: async () => ({ reply: "Our team will arrange it here.", buttons: [{ kind: "talk_to_us", label: "Talk", href: "https://wa.me/1" }], chat, failed: false, handoff: "return_request" }),
    };
    const msg: InboundMessage = { messageId: "wamid.T", from: "233200000001", name: null, type: "text", text: "It's torn" };
    await createWhatsAppHandler(deps)(msg, { id: "c1", handedOffAt: null });
    expect(handoffs).toEqual(["return_request"]);
});
