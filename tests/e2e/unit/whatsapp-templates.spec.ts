import { test, expect } from "@playwright/test";
import { fillTemplate, firstNameOf, ghs, NOT_SENT_YET, readableNumber, TEMPLATE_KEYS, templateValue, WA_TEMPLATES } from "../../../src/lib/whatsapp/templates";
import { pickTemplate, sendNotice, sendTeamTemplate, type NoticeDeps } from "../../../src/lib/whatsapp/templateSend";
import { orderTemplates, sendOrderUpdate, STATUS_TEMPLATES, type UpdateDeps } from "../../../src/lib/whatsapp/orderUpdates";
import { budgetChoice, inviteChoice, newOrderChoice, riderChoice, walletChoice } from "../../../src/lib/whatsapp/teamAlerts";
import { forwardToTeam, handoffTemplate } from "../../../src/lib/whatsapp/handoff";
import { runUnpaidNudges, type NudgeDeps } from "../../../src/lib/whatsapp/unpaidNudge";
import { templateIdsValue } from "../../../src/lib/ai/templateSettings";
import { staffNumbersValue } from "../../../src/lib/ai/templateSettings";

// Fake numbers (2332000000xx) only.
const NOW = Date.parse("2026-10-27T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW - h * 3600_000).toISOString();
const ORDER = { id: "4a8ff381-0000-4000-8000-000000000000", customer_name: "Ama Mensah", customer_phone: "0200000001", delivery_method: "delivery" };

// Names already approved, rejected or deleted in Chatbots Africa: Meta blocks a reused name.
const BURNED = ["order_status_update", "order_status_update_v2", "order_status_update_v3", "team_chat_handoff", "team_chat_alert",
    "order_payment_received", "order_packed", "order_on_its_way", "order_ready_for_pickup", "order_delivered", "order_cancel", "order_cancelled"];

test("every template passes Meta's rules", () => {
    const names = TEMPLATE_KEYS.map(k => WA_TEMPLATES[k].name);
    expect(new Set(names).size).toBe(names.length);
    for (const k of TEMPLATE_KEYS) {
        const { name, body, vars } = WA_TEMPLATES[k];
        // New names carry the prefix; order_status_update_v4 was approved before.
        if (k !== "order_status") expect(name).toMatch(/^miss_tokyo_[a-z0-9_]+$/);
        expect(BURNED).not.toContain(name);
        // Never starts or ends with a variable, never two side by side.
        expect(body).not.toMatch(/^\s*\{\{/);
        expect(body).not.toMatch(/\{\{\d+\}\}[\s.]*$/);
        expect(body).not.toMatch(/\}\}[\s,.:;]*\{\{/);
        // {{1}}…{{n}} in order, one per named value.
        const nums = [...body.matchAll(/\{\{(\d+)\}\}/g)].map(m => Number(m[1]));
        expect(nums).toEqual(vars.map((_, i) => i + 1));
        expect(body).toMatch(/Miss Tokyo/);
        // No payment provider or network, no emoji, links only to the shop.
        expect(body).not.toMatch(/paystack|momo|mtn|vodafone|telecel|airteltigo/i);
        expect(body).not.toMatch(/\p{Extended_Pictographic}/u);
        for (const link of body.match(/https?:\/\/\S+/g) ?? []) expect(link).toMatch(/^https:\/\/misstokyo\.shop/);
        expect(body.length).toBeLessThan(1024);
    }
});

test("values are one line, never empty; a missing value means no template", () => {
    expect(templateValue("  12 Oxford St\n Osu\tAccra  ")).toBe("12 Oxford St Osu Accra");
    expect(fillTemplate("order_ready_for_pickup", ["Ama", "4A8FF381", "Oxford Street, Osu, Accra"])!.text)
        .toBe("Hi Ama, your Miss Tokyo order 4A8FF381 is ready for pickup.\n\nYou can collect it from our store at Oxford Street, Osu, Accra.\n\nIf you have any questions about your order, reply to this message and our team will help you.");
    expect(fillTemplate("order_ready_for_pickup", ["Ama", "4A8FF381", "  "])).toBeNull();
    expect(fillTemplate("order_ready_for_pickup", ["Ama", "4A8FF381"])).toBeNull();
    expect(firstNameOf(null)).toBe("there");
    expect(readableNumber("+233 24 412 3456")).toBe("0244123456");
    expect(readableNumber("0244123456")).toBe("0244123456");
    expect(ghs(450)).toBe("450.00");
    // Every key not sent yet is a real key.
    for (const k of Object.keys(NOT_SENT_YET)) expect(TEMPLATE_KEYS as readonly string[]).toContain(k);
});

test("settings: ids only for known keys, up to five staff numbers in 233 form", () => {
    expect(templateIdsValue({ order_confirmed: "1683694653272406", refund_sent: "" })).toBe(true);
    expect(templateIdsValue({ paid: "1" })).toBe(false);
    expect(templateIdsValue({ order_confirmed: 1 })).toBe(false);
    expect(staffNumbersValue(["233200000001", "233200000002"])).toBe(true);
    expect(staffNumbersValue(["0200000001"])).toBe(false);
    expect(staffNumbersValue(["233200000001", "233200000001"])).toBe(false);
    expect(staffNumbersValue(Array.from({ length: 6 }, (_, i) => `23320000000${i}`))).toBe(false);
});

function noticeDeps(o: { ids?: Partial<Record<string, number>>; lastInboundAt?: string | null; optedOut?: boolean } = {}) {
    const calls: string[] = [];
    const logged: string[] = [];
    const d: NoticeDeps = {
        templateIdFor: k => o.ids?.[k] ?? null,
        conversationFor: async () => ({ id: "c1", optedOut: !!o.optedOut, lastInboundAt: o.lastInboundAt === undefined ? hoursAgo(30) : o.lastInboundAt }),
        sendText: async (to, text) => { calls.push(`text:${to}:${text}`); return { ok: true, messageId: "t" }; },
        sendTemplate: async (to, id, ph) => { calls.push(`template:${to}:${id}:${(ph ?? []).join("|")}`); return { ok: true, messageId: "w" }; },
        logOutbound: async (_c, text) => { logged.push(text); },
        now: () => NOW,
    };
    return { d, calls, logged };
}

test("a notice: free text inside the window, else the first template with an id, else the variable-free one", async () => {
    const choices = [{ key: "order_on_its_way" as const, values: ["Ama", "4A8FF381", "Kojo", "0240000000"] }, { key: "order_status" as const, values: ["Ama", "4A8FF381", "on its way"] }];
    const inside = noticeDeps({ lastInboundAt: hoursAgo(1), ids: { order_on_its_way: 9 } });
    expect(await sendNotice({ phone: "0200000001", freeText: "Hi Ama", templates: choices }, inside.d)).toBe("sent_text");
    expect(inside.calls).toEqual(["text:233200000001:Hi Ama"]);

    const rich = noticeDeps({ ids: { order_on_its_way: 9, order_status: 8 } });
    expect(await sendNotice({ phone: "0200000001", freeText: "Hi Ama", templates: choices }, rich.d)).toBe("sent_template");
    expect(rich.calls).toEqual(["template:233200000001:9:Ama|4A8FF381|Kojo|0240000000"]);
    expect(rich.logged[0]).toMatch(/^Hi Ama, your Miss Tokyo order 4A8FF381 is on its way to you\.\n\nYour rider is Kojo/);

    const general = noticeDeps({ ids: { order_status: 8 } });
    await sendNotice({ phone: "0200000001", freeText: "x", templates: choices }, general.d);
    expect(general.calls).toEqual(["template:233200000001:8:Ama|4A8FF381|on its way"]);

    const legacy = noticeDeps();
    expect(await sendNotice({ phone: "0200000001", freeText: "x", templates: choices, legacy: { templateId: 7, text: "Old words." }, tag: "[order 4A8FF381]" }, legacy.d)).toBe("sent_template");
    expect(legacy.calls).toEqual(["template:233200000001:7:"]);
    expect(legacy.logged).toEqual(["Old words.\n[order 4A8FF381]"]);

    expect(await sendNotice({ phone: "0200000001", freeText: "x", templates: choices }, noticeDeps().d)).toBe("no_template");
    expect(await sendNotice({ phone: "0200000001", freeText: "x", templates: choices }, noticeDeps({ optedOut: true, ids: { order_status: 8 } }).d)).toBe("opted_out");
    expect(await sendNotice({ phone: null, freeText: "x", templates: choices }, noticeDeps().d)).toBe("no_phone");
    // An empty value skips that template for the next one.
    expect(pickTemplate([{ key: "order_on_its_way", values: ["Ama", "4A8FF381", "Kojo", ""] }, choices[1]], k => (k === "order_status" ? 8 : 9))!.key).toBe("order_status");
});

test("order updates choose the template with the details they have", () => {
    const keys = (e: Parameters<typeof orderTemplates>[0], extra = {}) => orderTemplates(e, ORDER, extra).map(c => c.key);
    expect(keys("paid")).toEqual(["order_confirmed", "order_status"]);
    expect(keys("shipped", { rider: { name: "Kojo", phone: "+233 24 000 0000" } })).toEqual(["order_on_its_way", "order_status"]);
    expect(orderTemplates("shipped", ORDER, { rider: { name: "Kojo", phone: "+233 24 000 0000" } })[0].values).toEqual(["Ama", "4A8FF381", "Kojo", "0240000000"]);
    expect(keys("shipped", { rider: { name: "Kojo", phone: "0240000000" }, partShipped: true })).toEqual(["order_part_shipped", "order_status"]);
    expect(keys("shipped", { rider: { name: "Kojo", phone: null } })).toEqual(["order_status"]);
    expect(orderTemplates("ready_for_pickup", ORDER, { store: "12 Oxford St\nOsu" })[0].values).toEqual(["Ama", "4A8FF381", "12 Oxford St, Osu"]);
    expect(keys("ready_for_pickup")).toEqual(["order_status"]);
    for (const e of ["packed", "fulfilled", "cancelled"] as const) expect(keys(e)).toEqual(["order_status"]);
    expect(orderTemplates("fulfilled", ORDER)[0].values).toEqual(["Ama", "4A8FF381", "delivered"]);
});

test("sendOrderUpdate: the template with variables beats the variable-free one, which stays the fallback", async () => {
    const calls: string[] = [];
    const base: UpdateDeps = {
        enabled: true,
        templateIdFor: () => 4321,
        conversationFor: async () => ({ id: "c1", optedOut: false, lastInboundAt: null }),
        sendText: async () => ({ ok: true, messageId: "t" }),
        sendTemplate: async (to, id, ph) => { calls.push(`${id}:${(ph ?? []).join("|")}`); return { ok: true, messageId: "w" }; },
        logOutbound: async () => {},
        now: () => NOW,
    };
    expect(await sendOrderUpdate(ORDER, "paid", {}, { ...base, variableTemplateIdFor: k => (k === "order_confirmed" ? 55 : null) })).toBe("sent_template");
    expect(await sendOrderUpdate(ORDER, "paid", {}, base)).toBe("sent_template");
    expect(calls).toEqual(["55:Ama|4A8FF381", "4321:"]);
    expect(STATUS_TEMPLATES.paid.text).not.toMatch(/\{\{/);
});

test("team templates: always a template, only with an id, each number once", async () => {
    const sent: string[] = [];
    const deps = (id: number | null) => ({ templateIdFor: () => id, sendTemplate: async (to: string, t: number, ph: string[]) => { sent.push(`${to}:${t}:${ph.join("|")}`); return { ok: true as const, messageId: "w" }; } });
    const choice = newOrderChoice({ id: "4a8ff381-0000-4000-8000-000000000000", customer: "Ama Mensah", total: 450, channel: "till", pickup: false, area: "East Legon, Accra" });
    expect(choice.values).toEqual(["4A8FF381", "Ama Mensah", "450.00", "the till", "delivery to East Legon", "4a8ff381-0000-4000-8000-000000000000"]);
    expect(await sendTeamTemplate(["233200000001", "0200000001", null], choice, deps(77))).toBe(1);
    expect(await sendTeamTemplate(["233200000002"], choice, deps(null))).toBe(0);
    expect(sent).toEqual(["233200000001:77:4A8FF381|Ama Mensah|450.00|the till|delivery to East Legon|4a8ff381-0000-4000-8000-000000000000"]);
    expect(newOrderChoice({ id: "4a8ff381-x", customer: null, total: 10, channel: "online", pickup: true }).values.slice(1, 5)).toEqual(["a walk-in customer", "10.00", "the online shop", "pickup from the store"]);
    expect(riderChoice("Kwame Asante", 7, ["Ama, Osu", "and 6 more"]).values).toEqual(["Kwame", "7", "Ama, Osu; and 6 more"]);
    expect(inviteChoice({ role: "sales_staff", token: "abc" }).values).toEqual(["there", "sales staff", "abc"]);
    expect(walletChoice(42.5, 100).values).toEqual(["42.50", "100.00"]);
    expect(budgetChoice(80, 40, 50).values).toEqual(["80", "40.00", "50.00"]);
    for (const c of [choice, riderChoice("Kwame", 1, ["Ama"]), inviteChoice({ role: "admin", token: "t" }), walletChoice(1, 2), budgetChoice(100, 50, 50)]) {
        expect(fillTemplate(c.key, c.values)).not.toBeNull();
    }
});

test("handoff: the detailed template first, then team_chat_alert, then free text; a return names the order", async () => {
    const chat = { name: "Ama Mensah", phone: "233200000001", history: [], returnDetails: { ref: "4A8FF381", reason: "wrong size", wants: "an exchange" } };
    expect(handoffTemplate(chat, "customer_asked", "c1").filled!.placeholders).toEqual(["Ama Mensah", "0200000001", "asked for a person", "c1"]);
    expect(handoffTemplate(chat, "return_request", "c1").filled!.placeholders).toEqual(["Ama Mensah", "0200000001", "4A8FF381", "wrong size", "an exchange", "c1"]);
    expect(handoffTemplate({ ...chat, name: null }, "daily_limit", "c1").filled!.placeholders[0]).toBe("Not given");

    const sent: string[] = [];
    const deps = {
        teamNumber: "233200000099",
        load: async () => chat,
        sendWhatsApp: async () => { sent.push("text"); return { ok: true as const, messageId: "t" }; },
        templateId: 2323512958424807,
        sendTemplate: async (_to: string, id: number, ph?: string[]) => { sent.push(`${id}:${(ph ?? []).length}`); return { ok: true as const, messageId: "w" }; },
        sendSms: async () => ({ ok: true }),
        inboxUrl: (id: string) => `https://misstokyo.shop/customers/whatsapp?c=${id}`,
    };
    await forwardToTeam("c1", "return_request", { ...deps, richTemplateIdFor: k => (k === "team_return_request" ? 61 : null) });
    await forwardToTeam("c1", "customer_asked", { ...deps, richTemplateIdFor: k => (k === "team_return_request" ? 61 : null) });
    await forwardToTeam("c1", "customer_asked", { ...deps, templateId: null });
    expect(sent).toEqual(["61:6", "2323512958424807:0", "text"]);
});

test("the unpaid reminder goes as a template outside the window only when it has one", async () => {
    const sent: string[] = [];
    const deps = (templateId: number | null): NudgeDeps => ({
        candidates: async () => [{ id: "4a8ff381-0000-4000-8000-000000000001", customer_name: "Ama", customer_phone: "0200000001", created_at: hoursAgo(0.7) }],
        claim: async () => true,
        conversation: async () => ({ id: "c1", optedOut: false, handedOff: false, lastInboundAt: hoursAgo(26) }),
        orderedSince: async () => false,
        sendText: async () => { sent.push("text"); return { ok: true, messageId: "t" }; },
        templateId,
        sendTemplate: async (_to, id, ph) => { sent.push(`${id}:${ph.join("|")}`); return { ok: true, messageId: "w" }; },
        logOutbound: async () => {},
        now: () => NOW,
    });
    expect(await runUnpaidNudges(deps(null))).toEqual({ outside_window: 1 });
    expect(await runUnpaidNudges(deps(31))).toEqual({ sent: 1 });
    expect(sent).toEqual(["31:Ama|4A8FF381"]);
});
