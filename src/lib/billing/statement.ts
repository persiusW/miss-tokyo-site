// The features bill: what each metered service used, priced at the admin's
// unit prices and lifted by one markup %, and what the client is shown.
// Pure. The client (owner) only ever sees client-facing amounts: never a cost
// price, a model cost or the markup %.
import { fromP, toP, r2 } from "./money";

export type Usage = {
    /** Model cost in USD (ai_turns.cost_usd). */
    aiCostUsd: number;
    /** AI replies (ai_turns rows). */
    aiReplies: number;
    smsMessages: number;
    smsUnits: number;
    /** WhatsApp messages that are not templates (replies, staff replies, photos, alerts). */
    waMessages: number;
    waTemplates: number;
};

export const EMPTY_USAGE: Usage = { aiCostUsd: 0, aiReplies: 0, smsMessages: 0, smsUnits: 0, waMessages: 0, waTemplates: 0 };

export type Rates = {
    /** "cost": GH₵ billed per GH₵ of model cost. "reply": GH₵ per AI reply. */
    aiUnit: "cost" | "reply";
    aiRate: number | null;
    usdToGhs: number;
    smsRate: number | null;
    waMessageRate: number | null;
    waTemplateRate: number | null;
    markupPct: number;
};

export type OtherLine = { id: string; description: string; quantity: number; unit: string; unitPrice: number };

export type Visibility = {
    ai: boolean; sms: boolean; wa_message: boolean; wa_template: boolean; other: boolean;
    /** Show quantities (replies, units, messages) next to each line. */
    quantities: boolean;
    /** Show the client unit price (already marked up). */
    unit_prices: boolean;
};

export const DEFAULT_VISIBILITY: Visibility = { ai: true, sms: true, wa_message: true, wa_template: true, other: true, quantities: true, unit_prices: false };

export type ServiceKey = "ai" | "sms" | "wa_message" | "wa_template" | "other";

/** One priced line. `cost*` fields are internal (admin only). */
export type PricedLine = {
    service: ServiceKey;
    key: string;
    description: string;
    quantity: number;
    unit: string;
    /** What the admin prices one unit at, before markup. Null = not priced yet (left off the bill). */
    unitRate: number | null;
    /** For AI by cost: the model cost in GH₵ at the admin's rate. */
    costGhs: number | null;
    /** Before markup. */
    baseGhs: number;
    /** What the client pays for the line: base × (1 + markup), to the pesewa. */
    amountGhs: number;
    priced: boolean;
    /** Billed per unit shown (so a client unit price is honest). AI by cost is not. */
    perUnit: boolean;
};

/** The line the client is shown, and what is sent to Dashttp. */
export type ClientLine = { service: ServiceKey; description: string; quantity: number; unit: string; amountGhs: number; unitPriceGhs?: number };

const up = (baseP: number, markupPct: number) => Math.round(baseP * (1 + Math.max(0, markupPct) / 100));

export function priceLines(u: Usage, r: Rates, other: OtherLine[] = []): PricedLine[] {
    const out: PricedLine[] = [];
    const aiCostGhs = r2(u.aiCostUsd * (r.usdToGhs > 0 ? r.usdToGhs : 0));
    const line = (service: ServiceKey, key: string, description: string, quantity: number, unit: string, unitRate: number | null, billedQty: number, costGhs: number | null = null, perUnit = true): PricedLine => {
        const priced = unitRate != null && Number.isFinite(unitRate) && unitRate >= 0;
        const baseP = priced ? Math.round(billedQty * toP(unitRate!)) : 0;
        return { service, key, description, quantity, unit, unitRate: priced ? unitRate : null, costGhs, baseGhs: fromP(baseP), amountGhs: fromP(up(baseP, r.markupPct)), priced, perUnit };
    };
    out.push(r.aiUnit === "reply"
        ? line("ai", "ai", "AI assistants", u.aiReplies, "reply", r.aiRate, u.aiReplies, aiCostGhs)
        : line("ai", "ai", "AI assistants", u.aiReplies, "reply", r.aiRate, aiCostGhs, aiCostGhs, false));
    out.push(line("sms", "sms", "SMS messages", u.smsUnits, "SMS unit", r.smsRate, u.smsUnits));
    out.push(line("wa_message", "wa_message", "WhatsApp messages", u.waMessages, "message", r.waMessageRate, u.waMessages));
    out.push(line("wa_template", "wa_template", "WhatsApp templates", u.waTemplates, "template", r.waTemplateRate, u.waTemplates));
    for (const o of other) out.push(line("other", `other:${o.id}`, o.description, o.quantity, o.unit || "item", o.unitPrice, o.quantity));
    return out;
}

export function totalOf(lines: { amountGhs: number; priced?: boolean }[]): number {
    return fromP(lines.reduce((s, l) => s + (l.priced === false ? 0 : toP(l.amountGhs)), 0));
}

/**
 * What the client sees: priced lines only, the services the admin chose to
 * show, and a hidden service's amount folded into "Other services" so the
 * total always matches the bill.
 */
export function clientLines(lines: PricedLine[], v: Visibility, markupPct: number): ClientLine[] {
    const out: ClientLine[] = [];
    let hiddenP = 0;
    for (const l of lines) {
        if (!l.priced) continue;
        if (!v[l.service]) { hiddenP += toP(l.amountGhs); continue; }
        const c: ClientLine = { service: l.service, description: l.description, quantity: v.quantities ? l.quantity : 0, unit: v.quantities ? l.unit : "", amountGhs: l.amountGhs };
        // Per-unit prices only for lines billed per unit (AI by cost has no honest client unit price).
        if (v.unit_prices && v.quantities && l.unitRate != null && l.perUnit) {
            c.unitPriceGhs = fromP(up(toP(l.unitRate), markupPct));
        }
        out.push(c);
    }
    if (hiddenP > 0) out.push({ service: "other", description: "Other services", quantity: 0, unit: "", amountGhs: fromP(hiddenP) });
    return out;
}

/** Month-end estimate from use so far: straight line over the days gone. */
export function projectTotal(soFarGhs: number, elapsedDays: number, totalDays: number): number {
    if (!(elapsedDays > 0) || !(totalDays > 0)) return r2(soFarGhs);
    return r2(soFarGhs / elapsedDays * totalDays);
}

/** A sensible step for a cap of this size. */
export function capStep(x: number): number {
    return x < 100 ? 10 : x < 1000 ? 50 : 100;
}

/**
 * The cap the page proposes: the projected period total plus a fifth for
 * headroom, rounded up to a tidy step. Never below one step, so a quiet
 * month still gets a usable proposal.
 */
export function proposeCap(projectedGhs: number): { capGhs: number; why: string } {
    const want = Math.max(0, projectedGhs) * 1.2;
    const step = capStep(want);
    const capGhs = Math.max(step, Math.ceil(want / step - 1e-9) * step);
    const why = projectedGhs > 0
        ? `About GH₵ ${projectedGhs.toFixed(2)} by the cut-off at this period's pace, plus a fifth for busy days, rounded up to the next GH₵ ${step}.`
        : `Nothing billable has been used yet this period, so this is the smallest step.`;
    return { capGhs, why };
}

export function capState(totalGhs: number, capGhs: number | null): "none" | "ok" | "near" | "reached" {
    if (capGhs == null || !(capGhs > 0)) return "none";
    if (toP(totalGhs) >= toP(capGhs)) return "reached";
    if (toP(totalGhs) >= toP(capGhs * 0.8)) return "near";
    return "ok";
}

/** Dashttp's Idempotency-Key for one statement. */
export function statementKey(clientId: string, start: string, end: string): string {
    return `${clientId}:${start}:${end}`;
}
