import { test, expect } from "@playwright/test";
import { widgetHiddenOn } from "../../../src/components/shop/askMissTokyo/visibility";
import { LINES } from "../../../src/lib/ai/shopAssistant/lines";
import { maskPersonal, conversationText, firstQuestion } from "../../../src/lib/ai/shopAssistant/adminView";

// The store persists to sessionStorage, which Node lacks. Give it an in-memory one
// before the store module loads, so the run stays free of storage warnings.
const mem = new Map<string, string>();
(globalThis as { sessionStorage?: unknown }).sessionStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => { mem.set(k, v); },
    removeItem: (k: string) => { mem.delete(k); },
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const loadStore = async (): Promise<typeof import("../../../src/components/shop/askMissTokyo/chatStore")> => require("../../../src/components/shop/askMissTokyo/chatStore");

test("hidden on checkout, payment and account set-up pages only", () => {
    for (const p of ["/checkout", "/checkout/success", "/checkout/direct", "/pay/abc", "/gift-cards/success", "/auth/confirm", "/reset-password", "/claim-account", "/claim-account/x"]) {
        expect(widgetHiddenOn(p), p).toBe(true);
    }
    for (const p of ["/", "/shop", "/products/lisa-heels", "/faq", "/track", "/gift-cards", "/account", "/checkouts-guide"]) {
        expect(widgetHiddenOn(p), p).toBe(false);
    }
});

test("bubbles never show raw text", async () => {
    const { bubbleText } = await loadStore();
    expect(bubbleText("Size 38 is in stock.")).toBe("Size 38 is in stock.");
    expect(bubbleText("<!doctype html><html>")).toBe(LINES.generic);
    expect(bubbleText({ error: "x" })).toBe(LINES.generic);
});

test("the store refuses raw text in assistant bubbles", async () => {
    const { useAskStore } = await loadStore();
    const st = useAskStore.getState();
    st.reset();
    st.push({ id: "a", who: "assistant", text: "TypeError: x" });
    st.push({ id: "c", who: "customer", text: "TypeError: x" });
    const [a, c] = useAskStore.getState().bubbles;
    expect(a.text).toBe(LINES.generic);
    expect(c.text).toBe("TypeError: x");
    st.reset();
});

test("the store keeps only the last 40 bubbles", async () => {
    const { useAskStore } = await loadStore();
    const st = useAskStore.getState();
    st.reset();
    for (let i = 0; i < 45; i++) st.push({ id: String(i), who: "customer", text: `m${i}` });
    const b = useAskStore.getState().bubbles;
    expect(b).toHaveLength(40);
    expect(b[0].id).toBe("5");
    st.reset();
});

test("admins see the conversation only, with phones and emails masked", () => {
    expect(maskPersonal("Call 024 123 4567 or ama.mensah@gmail.com")).toBe("Call •••• 4567 or •••@gmail.com");
    expect(maskPersonal("+233241234567")).toBe("•••• 4567");
    expect(maskPersonal("Order 3BBB1012 total GH₵ 357.50")).toBe("Order 3BBB1012 total GH₵ 357.50");
    const msgs = [
        { role: "user", content: "[Earlier in this chat: the customer asked \"x\"]\nMy number is 0241234567" },
        { role: "assistant", content: [{ type: "thinking", thinking: "secret" }, { type: "tool_use", id: "t", name: "track_order", input: { phone: "0241234567" } }] },
        { role: "user", content: [{ type: "tool_result", tool_use_id: "t", content: "{\"order\":1}" }] },
        { role: "assistant", content: [{ type: "text", text: "Found it." }] },
    ];
    expect(conversationText(msgs)).toEqual([
        { who: "customer", text: "My number is •••• 4567" },
        { who: "assistant", text: "Found it." },
    ]);
    expect(firstQuestion(msgs)).toBe("My number is •••• 4567");
    expect(conversationText("junk")).toEqual([]);
});
