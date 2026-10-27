// What the shop's own people are told on WhatsApp, as template choices.
// Pure: the senders are in templateSendLive.
import type { TemplateChoice } from "./templateSend";
import { firstNameOf, ghs } from "./templates";

export type NewOrderAlert = {
    id: string;
    customer: string | null;
    total: number;
    channel: "online" | "till" | "whatsapp";
    pickup: boolean;
    /** Where it is going, for a delivery (region, city or the first part of the address). */
    area?: string | null;
};

const CHANNEL: Record<NewOrderAlert["channel"], string> = { online: "the online shop", till: "the till", whatsapp: "WhatsApp" };

export function newOrderChoice(o: NewOrderAlert): TemplateChoice {
    const area = String(o.area ?? "").split(/[,\n]/)[0].trim();
    const delivery = o.pickup ? "pickup from the store" : area ? `delivery to ${area}` : "delivery";
    return {
        key: "team_new_order",
        values: [o.id.slice(0, 8).toUpperCase(), o.customer?.trim() || "a walk-in customer", ghs(o.total), CHANNEL[o.channel], delivery, o.id],
    };
}

/** The rider's template: who and roughly where, as the dispatch SMS says it. */
export function riderChoice(riderName: string | null, count: number, deliveries: string[]): TemplateChoice {
    return { key: "rider_new_delivery", values: [firstNameOf(riderName), String(count), deliveries.join("; ")] };
}

export function inviteChoice(a: { name?: string | null; role: string; token: string }): TemplateChoice {
    const role = a.role === "admin" ? "administrator" : a.role === "owner" ? "owner" : "sales staff";
    return { key: "team_invite", values: [firstNameOf(a.name), role, a.token] };
}

export const walletChoice = (balance: number, threshold: number): TemplateChoice => ({ key: "team_wallet_low", values: [ghs(balance), ghs(threshold)] });

export const budgetChoice = (level: 80 | 100, spentGhs: number, capGhs: number): TemplateChoice => ({ key: "team_ai_budget", values: [String(level), ghs(spentGhs), ghs(capGhs)] });
