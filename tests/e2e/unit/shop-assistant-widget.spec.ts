import { test, expect } from "@playwright/test";
import { widgetHiddenOn } from "../../../src/components/shop/askMissTokyo/visibility";
import { safeButton } from "../../../src/components/shop/askMissTokyo/buttons";
import { LINES } from "../../../src/lib/ai/shopAssistant/lines";
import { maskPersonal, conversationText, firstQuestion } from "../../../src/lib/ai/shopAssistant/adminView";
import { readAnswer, newChatStarted } from "../../../src/components/shop/askMissTokyo/reply";

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

const item = { id: "i1", productId: "p1", name: "Lisa", slug: "lisa", price: 120, size: "38", imageUrl: "", quantity: 1 };

test("buttons with unsafe links or shapes are dropped", () => {
    for (const href of ["javascript:alert(1)", "//evil.com/products/x", "http://checkout.paystack.com/x", "https://evil.com/x", "/account"]) {
        expect(safeButton({ kind: "open_product", label: "x", href }), href).toBeNull();
    }
    expect(safeButton({ kind: "pay_now", label: "Pay", href: "https://checkout.paystack.com.evil.com/x" })).toBeNull();
    expect(safeButton({ kind: "pay_now", label: "Pay", href: "https://evil.com/https://checkout.paystack.com/" })).toBeNull();
    expect(safeButton({ kind: "talk_to_us", label: "x", href: "http://wa.me/233" })).toBeNull();
    expect(safeButton({ kind: "open_product", href: "/products/a" })).toBeNull();
    expect(safeButton({ kind: "other", label: "x" })).toBeNull();
    expect(safeButton(null)).toBeNull();
    for (const bad of [{ ...item, quantity: 0 }, { ...item, quantity: 21 }, { ...item, quantity: 1.5 }, { ...item, price: -1 }, { ...item, price: NaN }, { ...item, slug: 5 }, "x"]) {
        expect(safeButton({ kind: "add_to_cart", label: "Add", item: bad })).toBeNull();
    }
});

test("the four valid button shapes are kept", () => {
    const ok = [
        { kind: "open_product", label: "View", href: "/products/lisa" },
        { kind: "pay_now", label: "Pay", href: "https://checkout.paystack.com/abc" },
        { kind: "talk_to_us", label: "WhatsApp", href: "https://wa.me/233241234567?text=hi" },
        { kind: "add_to_cart", label: "Add", item },
    ];
    for (const b of ok) expect(safeButton(b)).toEqual(b);
});

test("the store drops unsafe buttons on push", async () => {
    const { useAskStore } = await loadStore();
    const st = useAskStore.getState();
    st.reset();
    st.push({ id: "a", who: "assistant", text: "Here", buttons: [
        { kind: "pay_now", label: "Pay", href: "javascript:alert(1)" },
        { kind: "open_product", label: "View", href: "/products/lisa" },
    ] as never });
    expect(useAskStore.getState().bubbles[0].buttons).toEqual([{ kind: "open_product", label: "View", href: "/products/lisa" }]);
    st.reset();
});

test("maskPersonal covers every phone format and leaves dates and prices alone", () => {
    for (const p of ["024.123.4567", "(024) 123 4567", "+233 (0)24 123 4567", "0241234567", "233241234567", "024 123 4567", "024-123-4567", "241234567"]) {
        expect(maskPersonal(p), p).toBe("•••• 4567");
    }
    for (const t of ["2026-10-11 14:30", "GH₵ 357.50", "Order 3BBB1012", "100 200 300 400"]) {
        expect(maskPersonal(t), t).toBe(t);
    }
    expect(maskPersonal("Ama.Mensah@Gmail.COM")).toBe("•••@Gmail.COM");
});

test("a 200 reply is shown as sent, with fresh passed through", () => {
    const btn = [{ kind: "talk_to_us", label: "Talk to us on WhatsApp", href: "https://wa.me/233553898704" }];
    expect(readAnswer({ ok: true, status: 200, json: { reply: "Hello there.", buttons: btn }, sent: "hi" }))
        .toEqual({ fresh: false, text: "Hello there.", buttons: btn });
    expect(readAnswer({ ok: true, status: 200, json: { reply: "Hello there.", buttons: [], fresh: true }, sent: "hi" }).fresh).toBe(true);
    expect(readAnswer({ ok: true, status: 200, json: { reply: "Hello there.", fresh: "yes" }, sent: "hi" }).fresh).toBe(false);
    expect(readAnswer({ ok: true, status: 200, json: null, sent: "hi" })).toEqual({ fresh: false, text: LINES.generic, retryText: "hi" });
});

test("the busy line always offers Retry", () => {
    expect(readAnswer({ ok: true, status: 200, json: { reply: LINES.busy, buttons: [] }, sent: "hi" }).retryText).toBe("hi");
});

test("calm server lines on a non-2xx are shown; Retry only for 429 and 5xx", () => {
    expect(readAnswer({ ok: false, status: 400, json: { reply: LINES.tooLong, buttons: [] }, sent: "hi" }))
        .toEqual({ fresh: false, text: LINES.tooLong, buttons: [] });
    expect(readAnswer({ ok: false, status: 403, json: { reply: LINES.refresh, buttons: [] }, sent: "hi" }).retryText).toBeUndefined();
    expect(readAnswer({ ok: false, status: 429, json: { reply: LINES.slowDown, buttons: [] }, sent: "hi" }))
        .toEqual({ fresh: false, text: LINES.slowDown, buttons: [], retryText: "hi" });
    expect(readAnswer({ ok: false, status: 502, json: { reply: LINES.generic }, sent: "hi" }).retryText).toBe("hi");
});

test("raw or missing text on a non-2xx becomes the calm line with Retry", () => {
    expect(readAnswer({ ok: false, status: 500, json: { reply: "TypeError: x is undefined" }, sent: "hi" }))
        .toEqual({ fresh: false, text: LINES.generic, retryText: "hi" });
    expect(readAnswer({ ok: false, status: 504, json: null, sent: "hi" })).toEqual({ fresh: false, text: LINES.generic, retryText: "hi" });
    expect(readAnswer({ ok: false, status: 400, json: { reply: 42 }, sent: "hi" })).toEqual({ fresh: false, text: LINES.generic, retryText: "hi" });
});

test("New chat clears the bubbles only when the server started one", () => {
    expect(newChatStarted(true, { ok: true })).toBe(true);
    expect(newChatStarted(true, { ok: false })).toBe(false);
    expect(newChatStarted(false, { ok: true })).toBe(false);
    expect(newChatStarted(true, null)).toBe(false);
});
