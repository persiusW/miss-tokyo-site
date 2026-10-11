import { test, expect } from "@playwright/test";
import { widgetHiddenOn } from "../../../src/components/shop/askMissTokyo/visibility";
import { bubbleText } from "../../../src/components/shop/askMissTokyo/chatStore";
import { LINES } from "../../../src/lib/ai/shopAssistant/lines";

test("hidden on checkout, payment and account set-up pages only", () => {
    for (const p of ["/checkout", "/checkout/success", "/checkout/direct", "/pay/abc", "/gift-cards/success", "/auth/confirm", "/reset-password", "/claim-account", "/claim-account/x"]) {
        expect(widgetHiddenOn(p), p).toBe(true);
    }
    for (const p of ["/", "/shop", "/products/lisa-heels", "/faq", "/track", "/gift-cards", "/account", "/checkouts-guide"]) {
        expect(widgetHiddenOn(p), p).toBe(false);
    }
});

test("bubbles never show raw text", () => {
    expect(bubbleText("Size 38 is in stock.")).toBe("Size 38 is in stock.");
    expect(bubbleText("<!doctype html><html>")).toBe(LINES.generic);
    expect(bubbleText({ error: "x" })).toBe(LINES.generic);
});
