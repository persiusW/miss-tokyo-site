import { test, expect } from "@playwright/test";
import { failureReason, maskRecipient, summariseUsage, countBy } from "../../../src/lib/ai/insights";
import { audienceForPath, cleanPlace, ErrorEventGate, PAGE_ROUTES } from "../../../src/lib/errors/errorPlace";
import { pageAll } from "../../../src/lib/ai/insights";
import fs from "fs";
import path from "path";

test("failure reasons are plain and never the provider's text", () => {
    expect(failureReason("sms", "Insufficient balance on account")).toBe("SMS credit has run out.");
    expect(failureReason("sms", "Invalid recipient number 0244")).toBe("The phone number isn't valid.");
    expect(failureReason("sms", "mNotify returned HTML — check API key")).toBe("The SMS account settings need checking.");
    expect(failureReason("email", "Email bounced: mailbox full")).toBe("The email was rejected by the customer's mailbox.");
    expect(failureReason("email", null)).toBe("The email provider refused it.");
    expect(failureReason("sms", "something odd")).toBe("The SMS provider refused it.");
});

test("recipients are masked", () => {
    expect(maskRecipient("sms", "0241234567")).toBe("•••• 4567");
    expect(maskRecipient("email", "ama.mensah@gmail.com")).toBe("•••@gmail.com");
    expect(maskRecipient("email", "broken")).toBe("•••");
});

test("usage per staff, cost in GHS, newest first by spend", () => {
    const rows = [
        { user_id: "a", cost_usd: 0.1, created_at: "2026-10-09T10:00:00Z" },
        { user_id: "a", cost_usd: 0.2, created_at: "2026-10-09T12:00:00Z" },
        { user_id: "b", cost_usd: 0.05, created_at: "2026-10-08T09:00:00Z" },
        { user_id: null, cost_usd: 0.4, created_at: "2026-10-08T09:00:00Z" },
    ];
    const names = new Map([["a", "Dorothy"], ["b", "Kimathi"]]);
    expect(summariseUsage(rows, names, 15.5)).toEqual([
        { name: "Dorothy", questions: 2, cost_ghs: 4.65, last_used: "2026-10-09T12:00:00Z" },
        { name: "Kimathi", questions: 1, cost_ghs: 0.78, last_used: "2026-10-08T09:00:00Z" },
    ]);
});

test("counts by key, biggest first", () => {
    expect(countBy([{ k: "PAY-01" }, { k: "POS-01" }, { k: "PAY-01" }], r => r.k)).toEqual([{ key: "PAY-01", count: 2 }, { key: "POS-01", count: 1 }]);
});

test("error place is the page path with ids masked and nothing else", () => {
    expect(cleanPlace("https://misstokyo.shop/sales/orders/0b1c2d3e-1111-4222-8333-444455556666?tab=x#y")).toBe("/sales/orders/:id");
    expect(cleanPlace("/pos")).toBe("/pos");
    expect(cleanPlace("/track/MT-1234567890")).toBe("other");
    expect(cleanPlace(null)).toBeNull();
    expect(cleanPlace("not a url")).toBeNull();
    expect(cleanPlace("/" + "a".repeat(300))).toBe("other");
});

test("client error audience follows the dashboard paths", () => {
    expect(audienceForPath("/pos")).toBe("staff");
    expect(audienceForPath("/settings/ai")).toBe("staff");
    expect(audienceForPath("/agent")).toBe("staff");
    expect(audienceForPath("/shop")).toBe("customer");
    expect(audienceForPath("/checkout/success")).toBe("customer");
    expect(audienceForPath("/possum")).toBe("customer");
});

test("error place only ever names a real page; anything else is 'other'", () => {
    expect(cleanPlace("/products/summer-dress-2026")).toBe("/products/:slug");
    expect(cleanPlace("/pay/abc123")).toBe("/pay/:pos_id");
    expect(cleanPlace("/catalog/products/0b1c2d3e-1111-4222-8333-444455556666/edit")).toBe("/catalog/products/:id/edit");
    expect(cleanPlace("/catalog/products/low-stock")).toBe("/catalog/products/low-stock");
    expect(cleanPlace("/")).toBe("/");
    expect(cleanPlace("/x/ama.mensah@gmail.com")).toBe("other");
    expect(cleanPlace("/products/ama%40gmail.com")).toBe("other");
    expect(cleanPlace("/call-mr-kofi-on-whatsapp-for-refund")).toBe("other");
    expect(cleanPlace("/sales/orders/1/extra")).toBe("other");
});

test("every page in src/app is a known error place", () => {
    const root = path.join(__dirname, "../../../src/app");
    const found: string[] = [];
    const walk = (dir: string) => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, e.name);
            if (e.isDirectory()) walk(full);
            else if (e.name === "page.tsx") {
                const route = "/" + path.relative(root, dir).split(path.sep).filter(s => s && !/^\(.*\)$/.test(s)).join("/");
                found.push(route);
            }
        }
    };
    walk(root);
    const missing = found.filter(r => !PAGE_ROUTES.includes(r));
    expect(missing).toEqual([]);
});

test("error recording is throttled per instance and repeats collapse", () => {
    const g = new ErrorEventGate(3, 60_000);
    expect(g.allow("GEN-00|/pos|staff", 0)).toBe(true);
    expect(g.allow("GEN-00|/pos|staff", 1000)).toBe(false);
    expect(g.allow("PAY-01|/pos|staff", 1000)).toBe(true);
    expect(g.allow("PAY-02|/pos|staff", 1000)).toBe(true);
    expect(g.allow("PAY-03|/pos|staff", 1000)).toBe(false);
    expect(g.allow("GEN-00|/pos|staff", 61_000)).toBe(true);
});

test("pageAll reads past the 1000-row cap and stops at the limit", async () => {
    const rows = Array.from({ length: 2500 }, (_, i) => i);
    const fetch = async (from: number, to: number) => ({ data: rows.slice(from, to + 1), error: null });
    const all = await pageAll(fetch, 1000, 10);
    expect(all.rows.length).toBe(2500);
    expect(all.truncated).toBe(false);
    const capped = await pageAll(fetch, 1000, 2);
    expect(capped.rows.length).toBe(2000);
    expect(capped.truncated).toBe(true);
    const failing = await pageAll(async () => ({ data: null, error: { code: "x" } }), 1000, 3);
    expect(failing.error).toBeTruthy();
});

test("SMS account faults are not blamed on the customer's number", () => {
    expect(failureReason("sms", "Invalid API key")).toBe("The SMS account settings need checking.");
    expect(failureReason("sms", "invalid sender id")).toBe("The SMS account settings need checking.");
    expect(failureReason("sms", "401 Unauthorized")).toBe("The SMS account settings need checking.");
    expect(failureReason("sms", "Invalid recipient number")).toBe("The phone number isn't valid.");
});
