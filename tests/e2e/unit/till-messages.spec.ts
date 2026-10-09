import { test, expect } from "@playwright/test";
import { completionBanner, deliveryHeadline, deliveryToast, TILL_GENERIC, TILL_SERVER_UNREACHABLE } from "../../../src/lib/pos/tillMessages";
import { readJson } from "../../../src/lib/http/readJson";

test("headline says what actually went out", () => {
    expect(deliveryHeadline({ email: "sent", sms: "sent" })).toEqual({ text: "Sent by SMS and email", tone: "ok" });
    expect(deliveryHeadline({ email: "no_email", sms: "sent" })).toEqual({ text: "Sent by SMS", tone: "ok" });
    expect(deliveryHeadline({ email: "sent", sms: "failed" })).toEqual({ text: "Sent by email", tone: "ok" });
    expect(deliveryHeadline({ email: "failed", sms: "failed" })).toEqual({ text: "Not sent — copy the link and share it", tone: "warn" });
});

test("headline is only for link sales: a missing delivery block reads as not sent, so callers must not use it for completed sales", () => {
    expect(deliveryHeadline(undefined).tone).toBe("warn");
    expect(completionBanner("cash", true).title).toBe("Cash received");
});

test("toasts never carry provider text", () => {
    const raw = { email: "failed" as const, sms: "failed", smsError: "mNotify returned HTML — check API key", emailError: "Resend 500" };
    const t = deliveryToast(raw);
    expect(t.type).toBe("error");
    expect(t.message).not.toMatch(/mNotify|Resend|API key|HTML/);
    expect(deliveryToast({ email: "sent", sms: "sent" })).toEqual({ type: "success", message: "Payment link sent by email and SMS" });
    expect(deliveryToast({ email: "no_email", sms: "sent" })).toEqual({ type: "success", message: "Payment link sent by SMS" });
    expect(deliveryToast({ email: "no_email", sms: "failed", smsError: "x" }).message)
        .toBe("The SMS didn't go out and there's no email on file. Copy the link below and share it.");
    expect(deliveryToast({ email: "sent", sms: "failed" }).message).toBe("Email sent, but the SMS didn't go out. Copy the link below and share it.");
    expect(deliveryToast({ email: "failed", sms: "sent" }).message).toBe("SMS sent, but the email didn't go out.");
});

test("completion banner names the real method and never claims a receipt it can't send", () => {
    expect(completionBanner("cash", true)).toEqual({ title: "Cash received", note: "Receipt sent to the customer." });
    expect(completionBanner("cash", false)).toEqual({ title: "Cash received", note: "No receipt sent — no phone or email on file." });
    expect(completionBanner("gift_card", true)).toEqual({ title: "Paid in full by gift card", note: "Nothing to collect. Receipt sent to the customer." });
});

test("calm constants", () => {
    expect(TILL_GENERIC).toBe("Something happened. Please try again shortly.");
    expect(TILL_SERVER_UNREACHABLE).toBe("The till couldn't reach the server. Please try again.");
});

test("readJson refuses HTML, empty and broken bodies instead of throwing", async () => {
    const html = new Response("<html>504</html>", { status: 200, headers: { "content-type": "text/html" } });
    expect(await readJson(html)).toEqual({ data: null, isJson: false });
    const empty = new Response("", { status: 500, headers: { "content-type": "application/json" } });
    expect(await readJson(empty)).toEqual({ data: null, isJson: false });
    const ok = new Response(JSON.stringify({ a: 1 }), { status: 200, headers: { "content-type": "application/json; charset=utf-8" } });
    expect(await readJson(ok)).toEqual({ data: { a: 1 }, isJson: true });
});
