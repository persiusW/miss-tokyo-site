import { test, expect } from "@playwright/test";
import type { Stock } from "../../../src/lib/ai/catalogStock";
import { sizeMatches } from "../../../src/lib/ai/shopAssistant/format";
import { RESTOCK_PROMPT_NOTE, systemPromptFor } from "../../../src/lib/ai/shopAssistant/prompt";
import { CUSTOMER_TOOL_DEFS, NOTIFY_WHEN_BACK_TOOL, OPTIONAL_TOOL_NAMES } from "../../../src/lib/ai/shopAssistant/toolDefs";
import { NOTICE_TYPE } from "../../../src/lib/whatsapp/notices";
import { fillTemplate } from "../../../src/lib/whatsapp/templates";
import {
    pickOption, restockPlaceholders, restockText, runRestockAlerts, wantedInStock, type RestockDeps, type RestockRequest,
} from "../../../src/lib/whatsapp/restock";

// Fake numbers (2332000000xx) only.
const NOW = Date.parse("2026-10-16T12:00:00Z");
const SITE = "https://misstokyo.shop";
const perOption = (rows: [string | null, string | null, number][]): Stock => ({ tracked: "per_option", options: rows.map(([size, colour, available]) => ({ size, colour, brand: null, available })) });

test("wanted in stock: the asked size and colour, any when not given; untracked always", () => {
    const s = perOption([["M — 10", "Red", 0], ["L — 12", "Red", 2], ["M — 10", "Black", 1]]);
    expect(wantedInStock(s, "M", "Red")).toBe(false);
    expect(wantedInStock(s, "L", "red")).toBe(true);
    expect(wantedInStock(s, "M", null)).toBe(true);
    expect(wantedInStock(s, null, "Red")).toBe(true);
    expect(wantedInStock(perOption([["M — 10", "Red", 0]]), null, null)).toBe(false);
    expect(wantedInStock({ tracked: "product", available: 0 }, null, null)).toBe(false);
    expect(wantedInStock({ tracked: "product", available: 3 }, null, null)).toBe(true);
    expect(wantedInStock({ tracked: "not_tracked" }, "M", null)).toBe(true);
    expect(wantedInStock(undefined, null, null)).toBe(true);
});

test("a size or colour is taken as the product spells it, or refused with the ones it has", () => {
    expect(pickOption("m", ["S — 8", "M — 10"], (o, a) => sizeMatches(o, a), "size")).toEqual({ value: "M — 10" });
    expect(pickOption("XL", ["S — 8", "M — 10"], (o, a) => sizeMatches(o, a), "size")).toEqual({ error: "This piece doesn't come in size XL. It comes in: S — 8, M — 10." });
    expect(pickOption("", ["S — 8"], () => true, "size")).toEqual({ value: null });
    expect(pickOption("Red", null, () => false, "colour")).toEqual({ value: null });
});

test("notify_when_back is an optional WhatsApp tool after the cached ones, with its prompt line", () => {
    expect(CUSTOMER_TOOL_DEFS.map(t => t.name)).not.toContain("notify_when_back");
    expect(OPTIONAL_TOOL_NAMES).toContain(NOTIFY_WHEN_BACK_TOOL.name);
    expect(systemPromptFor("whatsapp", null, { restock: true })).toContain(RESTOCK_PROMPT_NOTE);
    expect(systemPromptFor("whatsapp", null)).not.toContain("notify_when_back");
});

const req = (over: Partial<RestockRequest> = {}): RestockRequest => ({
    id: "r1000000-0000-4000-8000-000000000001", conversationId: "c1", productId: "p1", size: "M — 10", colour: "Red",
    product: { name: "Lindsy Bodycon ", slug: "lindsy-bodycon", active: true },
    stock: perOption([["M — 10", "Red", 1]]),
    conversation: { phone: "233200000001", name: "Ama Mensah", optedOut: false, lastInboundAt: new Date(NOW - 3600_000).toISOString() },
    ...over,
});

test("the alert names the piece, the option and the link", () => {
    expect(restockText(req(), SITE)).toBe("Good news, Ama! Lindsy Bodycon (size M — 10, Red) is back in stock at Miss Tokyo: https://misstokyo.shop/products/lindsy-bodycon\n\nReply here if you'd like to order it.");
    // The template holds https://misstokyo.shop/products/, so {{3}} is the slug alone.
    expect(restockPlaceholders(req({ size: null, colour: null, conversation: { ...req().conversation, name: null } })))
        .toEqual(["there", "Lindsy Bodycon", "lindsy-bodycon"]);
});

function deps(o: { reqs?: RestockRequest[]; templateId?: number | null; sendOk?: boolean } = {}) {
    const texts: string[] = [];
    const templates: [number, string[]][] = [];
    const logged: [string, string | undefined][] = [];
    const status = new Map<string, string>();
    const d: RestockDeps = {
        expireOld: async () => 2,
        pending: async () => (o.reqs ?? [req()]).filter(r => (status.get(r.id) ?? "pending") === "pending"),
        claim: async id => { if ((status.get(id) ?? "pending") !== "pending") return false; status.set(id, "notified"); return true; },
        release: async id => { status.set(id, "pending"); },
        sendText: async (_to, text) => { texts.push(text); return o.sendOk === false ? { ok: false, code: "network" } : { ok: true, messageId: "wamid.R" }; },
        sendTemplate: async (_to, id, ph) => { templates.push([id, ph]); return { ok: true, messageId: "wamid.T" }; },
        logOutbound: async (_c, text, _id, type) => { logged.push([text, type]); },
        templateId: o.templateId ?? null,
        siteUrl: SITE,
        now: () => NOW,
    };
    return { d, texts, templates, logged, status };
}

test("back in stock inside the window: one text, logged as a notice, sent once", async () => {
    const h = deps();
    expect(await runRestockAlerts(h.d)).toEqual({ expired: 2, sent_text: 1 });
    expect(h.logged).toEqual([[restockText(req(), SITE), NOTICE_TYPE]]);
    expect(await runRestockAlerts(h.d)).toEqual({ expired: 2 });
    expect(h.texts).toHaveLength(1);
});

test("outside the window: the template when there is one, otherwise it waits", async () => {
    const old = req({ conversation: { ...req().conversation, lastInboundAt: new Date(NOW - 30 * 3600_000).toISOString() } });
    const waiting = deps({ reqs: [old] });
    expect(await runRestockAlerts(waiting.d)).toEqual({ expired: 2, waiting_for_template: 1 });
    expect(waiting.status.get(old.id)).toBeUndefined();
    const t = deps({ reqs: [old], templateId: 1072346328969351 });
    expect(await runRestockAlerts(t.d)).toEqual({ expired: 2, sent_template: 1 });
    expect(t.templates).toEqual([[1072346328969351, restockPlaceholders(old)]]);
    // Logged in the words the customer saw.
    expect(t.logged[0][0]).toBe(fillTemplate("back_in_stock", restockPlaceholders(old))!.text);
});

test("still sold out, inactive, or STOP: nothing sent and the request stays open", async () => {
    for (const [r, outcome] of [
        [req({ stock: perOption([["M — 10", "Red", 0]]) }), "not_yet"],
        [req({ product: { ...req().product, active: false } }), "not_yet"],
        [req({ conversation: { ...req().conversation, optedOut: true } }), "opted_out"],
    ] as const) {
        const h = deps({ reqs: [r] });
        expect(await runRestockAlerts(h.d)).toEqual({ expired: 2, [outcome]: 1 });
        expect(h.texts).toEqual([]);
        expect(h.status.get(r.id)).toBeUndefined();
    }
});

test("a failed send puts the request back for the next run", async () => {
    const h = deps({ sendOk: false });
    expect(await runRestockAlerts(h.d)).toEqual({ expired: 2, failed: 1 });
    expect([h.status.get(req().id), h.logged]).toEqual(["pending", []]);
});
