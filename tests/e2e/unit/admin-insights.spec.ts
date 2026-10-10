import { test, expect } from "@playwright/test";
import { failureReason, maskRecipient, summariseUsage, countBy } from "../../../src/lib/ai/insights";
import { audienceForPath, cleanPlace } from "../../../src/lib/errors/errorPlace";

test("failure reasons are plain and never the provider's text", () => {
    expect(failureReason("sms", "Insufficient balance on account")).toBe("SMS credit has run out.");
    expect(failureReason("sms", "Invalid recipient number 0244")).toBe("The phone number isn't valid.");
    expect(failureReason("sms", "mNotify returned HTML — check API key")).toBe("The SMS provider didn't answer properly.");
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
    expect(cleanPlace("/track/MT-1234567890")).toBe("/track/:id");
    expect(cleanPlace(null)).toBeNull();
    expect(cleanPlace("not a url")).toBeNull();
    expect(cleanPlace("/" + "a".repeat(300))!.length).toBeLessThanOrEqual(120);
});

test("client error audience follows the dashboard paths", () => {
    expect(audienceForPath("/pos")).toBe("staff");
    expect(audienceForPath("/settings/ai")).toBe("staff");
    expect(audienceForPath("/agent")).toBe("staff");
    expect(audienceForPath("/shop")).toBe("customer");
    expect(audienceForPath("/checkout/success")).toBe("customer");
    expect(audienceForPath("/possum")).toBe("customer");
});
