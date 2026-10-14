import { test, expect } from "@playwright/test";
import { createInterimHandler, UNSUPPORTED_TEXT } from "../../../src/lib/whatsapp/interimHandler";
import type { InboundMessage } from "../../../src/lib/whatsapp/pipeline";

function harness(alreadyHuman = false) {
    const sent: { to: string; text: string }[] = [];
    const handoffs: string[] = [];
    let human = alreadyHuman;
    const handle = createInterimHandler({
        send: async (to, text) => { sent.push({ to, text }); return { ok: true, messageId: null }; },
        handOff: async (_id, reason) => { handoffs.push(reason); if (human) return false; human = true; return true; },
    });
    return { handle, sent, handoffs };
}
const m = (type: string): InboundMessage => ({ messageId: "wamid.TEST", from: "233200000001", name: "Test Customer", type, text: type === "text" ? "Hi" : null });
const conv = { id: "c1", handedOffAt: null };

test("a photo or voice note: the chat goes to a person and the customer is told once", async () => {
    const h = harness();
    await h.handle(m("image"), conv);
    await h.handle(m("audio"), conv);
    expect(h.handoffs).toEqual(["unsupported_message", "unsupported_message"]);
    expect(h.sent).toEqual([{ to: "233200000001", text: UNSUPPORTED_TEXT }]);
    expect(UNSUPPORTED_TEXT).toMatch(/only read text/i);
    expect(UNSUPPORTED_TEXT).not.toMatch(/cash|error|sorry/i);
});

test("text goes to a person with no automatic reply until the assistant answers on WhatsApp", async () => {
    const h = harness();
    await h.handle(m("text"), conv);
    expect(h.handoffs).toEqual(["awaiting_assistant"]);
    expect(h.sent).toEqual([]);
});

test("no note when a person already has the chat", async () => {
    const h = harness(true);
    await h.handle(m("sticker"), conv);
    expect(h.sent).toEqual([]);
});
