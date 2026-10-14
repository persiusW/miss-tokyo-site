import { test, expect } from "@playwright/test";
import { buildHandoffMessages, forwardToTeam, localNumber } from "../../../src/lib/whatsapp/handoff";

const PHONE = "233200000001";

test("the team's handoff message: who, why, recent lines, a reply link and the inbox link", () => {
    const m = buildHandoffMessages({
        name: "Test Customer", phone: PHONE, reason: "customer_asked", inboxUrl: "https://misstokyo.shop/customers/whatsapp?c=c1",
        history: [
            { direction: "inbound", content: "Do you have this in M?", type: "text", at: "2026-10-14T17:30:00Z" },
            { direction: "outbound", content: "Yes, size M is in stock.", type: "text", at: "2026-10-14T17:30:05Z" },
            { direction: "inbound", content: null, type: "image", at: "2026-10-14T17:31:00Z" },
        ],
    });
    expect(m.whatsapp).toContain("Test Customer (0200000001) asked for a person.");
    expect(m.whatsapp).toContain("17:30 Customer: Do you have this in M?");
    expect(m.whatsapp).toContain("17:30 Assistant: Yes, size M is in stock.");
    expect(m.whatsapp).toContain("17:31 Customer: [image]");
    expect(m.whatsapp).toContain(`https://wa.me/${PHONE}`);
    expect(m.whatsapp).toContain("https://misstokyo.shop/customers/whatsapp?c=c1");
    expect(m.sms.length).toBeLessThanOrEqual(320);
    expect(m.sms).toContain(`wa.me/${PHONE}`);
    expect(localNumber("447700900000")).toBe("+447700900000");
});

test("the forward goes by WhatsApp and SMS to the team number, and never throws", async () => {
    const sent: string[] = [];
    const deps = {
        teamNumber: "233553898704",
        load: async () => ({ name: null, phone: PHONE, history: [] }),
        sendWhatsApp: async (to: string) => { sent.push(`wa:${to}`); return { ok: false as const, code: "network" as const }; },
        sendSms: async (to: string) => { sent.push(`sms:${to}`); return { ok: true }; },
        inboxUrl: (id: string) => `https://x/customers/whatsapp?c=${id}`,
    };
    expect(await forwardToTeam("c1", "daily_limit", deps)).toEqual({ whatsapp: false, sms: true });
    expect(sent.sort()).toEqual(["sms:233553898704", "wa:233553898704"]);
    expect(await forwardToTeam("c1", "daily_limit", { ...deps, load: async () => { throw new Error("db down"); } })).toEqual({ whatsapp: false, sms: false });
    expect(await forwardToTeam("c1", "daily_limit", { ...deps, teamNumber: null })).toEqual({ whatsapp: false, sms: false });
});

