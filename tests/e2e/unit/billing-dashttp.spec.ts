import "./stubSupabaseEnv";
import { test, expect } from "@playwright/test";
import crypto from "crypto";
import { dashttpLine, dashttpMode, getDashttpBilling, submitUsageInvoice, payUsageInvoice, getManageLink, safePaystackUrl, parseBilling } from "../../../src/lib/billing/dashttp";
import { resetMockDashttp } from "../../../src/lib/billing/dashttpMock";
import { verifyDashttpSignature, parseEvent } from "../../../src/lib/billing/dashttpWebhook";

// The Dashttp API is not live: nothing here calls it. Live-mode calls go to
// a fake fetch that records what it was sent.

const LIVE = { DASHTTP_API_BASE: "https://dashttp.example/", DASHTTP_CLIENT_TOKEN: "tok_test" };

test("mode: off without keys, mock only off Vercel, live with both keys", () => {
    expect(dashttpMode({})).toBe("off");
    expect(dashttpMode({ DASHTTP_API_BASE: "x" })).toBe("off");
    expect(dashttpMode(LIVE)).toBe("live");
    expect(dashttpMode({ DASHTTP_MOCK: "1" })).toBe("mock");
    expect(dashttpMode({ ...LIVE, DASHTTP_MOCK: "1", VERCEL: "1" })).toBe("live");
    expect(dashttpMode({ DASHTTP_MOCK: "1", VERCEL: "1" })).toBe("off");
});

test("not connected is a calm result, not a throw", async () => {
    expect(await getDashttpBilling({ env: {} })).toEqual({ ok: false, reason: "not_connected" });
});

test("live calls: bearer token, base path, idempotency key, client-facing body only", async () => {
    const sent: { url: string; init: RequestInit }[] = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
        sent.push({ url, init });
        return new Response(JSON.stringify({ id: "uinv_1", number: "U-1", amountGhs: 42.5, status: "open", lines: [] }), { status: 201 });
    }) as unknown as typeof fetch;
    const lines = [{ service: "sms", description: "SMS messages", quantity: 180, unit: "SMS unit", amountGhs: 42.5 }];
    const r = await submitUsageInvoice({ periodStart: "2026-10-08", periodEnd: "2026-10-28", lines, totalGhs: 42.5 }, "mt:2026-10-08:2026-10-28", { env: LIVE, fetchImpl });
    expect(r).toMatchObject({ ok: true, data: { id: "uinv_1", amountGhs: 42.5, status: "open" } });
    expect(sent[0].url).toBe("https://dashttp.example/api/client/v1/usage-invoices");
    const h = sent[0].init.headers as Record<string, string>;
    expect(h.Authorization).toBe("Bearer tok_test");
    expect(h["Idempotency-Key"]).toBe("mt:2026-10-08:2026-10-28");
    const body = JSON.parse(String(sent[0].init.body));
    expect(body).toEqual({ periodStart: "2026-10-08", periodEnd: "2026-10-28", lines, totalGhs: 42.5, currency: "GHS" });
});

test("live failures map to calm reasons", async () => {
    const reply = (status: number) => (async () => new Response("{}", { status })) as unknown as typeof fetch;
    expect(await getDashttpBilling({ env: LIVE, fetchImpl: reply(503) })).toEqual({ ok: false, reason: "unavailable" });
    expect(await getDashttpBilling({ env: LIVE, fetchImpl: reply(401) })).toEqual({ ok: false, reason: "not_connected" });
    expect(await getDashttpBilling({ env: LIVE, fetchImpl: reply(422) })).toEqual({ ok: false, reason: "refused" });
    const boom = (async () => { throw new Error("ECONNRESET"); }) as unknown as typeof fetch;
    expect(await getDashttpBilling({ env: LIVE, fetchImpl: boom })).toEqual({ ok: false, reason: "unavailable" });
});

test("the mock answers like the contract and is idempotent", async () => {
    resetMockDashttp();
    const env = { DASHTTP_MOCK: "1" };
    const b = await getDashttpBilling({ env });
    expect(b.ok && b.data.plan.name).toContain("fixture");
    expect(b.ok && b.data.openInvoices.map(i => i.number)).toEqual(["TEST-U-0000"]);
    const a1 = await submitUsageInvoice({ periodStart: "2026-10-08", periodEnd: "2026-10-28", lines: [], totalGhs: 10 }, "k", { env });
    const a2 = await submitUsageInvoice({ periodStart: "2026-10-08", periodEnd: "2026-10-28", lines: [], totalGhs: 10 }, "k", { env });
    expect(a1.ok && a2.ok && a1.data.id === a2.data.id).toBe(true);
    const pay = await payUsageInvoice(a1.ok ? a1.data.id : "", "http://localhost:3060/billing?paid=1", { env });
    expect(pay.ok && pay.data.authorizationUrl).toContain("mock_pay=");
    const link = await getManageLink({ env });
    expect(link.ok && safePaystackUrl(link.data.url)).toBeTruthy();
});

test("a malformed billing reply never crashes the page", () => {
    const b = parseBilling({ plan: { status: "weird", amount: "x" } });
    expect(b.plan).toMatchObject({ status: "attention", amount: 0, paymentMethod: null });
    expect(b.openInvoices).toEqual([]);
});

test("only Paystack's own hosted pages may be opened", () => {
    expect(safePaystackUrl("https://paystack.com/pay/abc")).toBeTruthy();
    expect(safePaystackUrl("https://checkout.paystack.com/xyz")).toBeTruthy();
    expect(safePaystackUrl("http://paystack.com/pay/abc")).toBeNull();
    expect(safePaystackUrl("https://paystack.com.evil.io/pay")).toBeNull();
    expect(safePaystackUrl("javascript:alert(1)")).toBeNull();
});

test("webhook signature: sha256 HMAC of the raw body, constant-time, nothing else accepted", () => {
    const secret = "whsec_test";
    const raw = JSON.stringify({ id: "evt_1", type: "invoice.paid", createdAt: "2026-10-29T10:00:00Z", data: { id: "uinv_1" } });
    const sig = "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");
    expect(verifyDashttpSignature(raw, sig, secret)).toBe(true);
    expect(verifyDashttpSignature(raw + " ", sig, secret)).toBe(false);
    expect(verifyDashttpSignature(raw, sig, "other")).toBe(false);
    expect(verifyDashttpSignature(raw, sig.replace("sha256=", ""), secret)).toBe(false);
    expect(verifyDashttpSignature(raw, "sha256=abc", secret)).toBe(false);
    expect(verifyDashttpSignature(raw, sig, undefined)).toBe(false);
    expect(verifyDashttpSignature(raw, null, secret)).toBe(false);
    expect(parseEvent(raw, null)).toMatchObject({ id: "evt_1", type: "invoice.paid" });
    expect(parseEvent(JSON.stringify({ type: "x", data: {} }), "evt_hdr")).toMatchObject({ id: "evt_hdr" });
    expect(parseEvent("not json", "x")).toBeNull();
});

test("statement lines match Dashttp's validation: five fields, a non-empty unit, total = sum of lines", async () => {
    // Mirrors dashttp-website src/lib/client-api/usage.ts (zod): unit min 1, quantity ≥ 0, total equals the lines.
    const hidden = dashttpLine({ service: "SMS", description: "Order messages", quantity: 0, unit: "", amountGhs: 12.5, ...{ unitPriceGhs: 0.05 } } as never);
    expect(hidden).toEqual({ service: "SMS", description: "Order messages", quantity: 1, unit: "period", amountGhs: 12.5 });
    const shown = dashttpLine({ service: "WhatsApp", description: "Replies", quantity: 80, unit: "messages", amountGhs: 40 });
    expect(shown).toEqual({ service: "WhatsApp", description: "Replies", quantity: 80, unit: "messages", amountGhs: 40 });
    let sent: any = null;
    const fetchImpl = (async (_u: string, init: any) => { sent = JSON.parse(init.body); return new Response(JSON.stringify({ id: "i1", number: "INV-1", amountGhs: 52.5, status: "open", lines: [] }), { status: 201 }); }) as typeof fetch;
    await submitUsageInvoice({ periodStart: "2026-10-08", periodEnd: "2026-10-28", lines: [{ service: "SMS", description: "x", quantity: 0, unit: "", amountGhs: 12.5 }, { service: "WhatsApp", description: "y", quantity: 80, unit: "messages", amountGhs: 40 }], totalGhs: 52.5 },
        "misstokyo:2026-10-08:2026-10-28", { env: { DASHTTP_API_BASE: "https://www.dashttp.com", DASHTTP_CLIENT_TOKEN: "t" } as never, fetchImpl });
    expect(sent.currency).toBe("GHS");
    expect(sent.lines.every((l: any) => typeof l.unit === "string" && l.unit.length > 0 && Object.keys(l).sort().join() === "amountGhs,description,quantity,service,unit")).toBe(true);
    expect(Math.round(sent.lines.reduce((s: number, l: any) => s + l.amountGhs, 0) * 100)).toBe(Math.round(sent.totalGhs * 100));
});
