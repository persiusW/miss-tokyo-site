// Back-in-stock alerts on WhatsApp. A customer asks the assistant to be told
// when a sold-out piece (optionally a size and colour) is back; an hourly run
// sends one message when it is. Inside the 24-hour window that is a text;
// later only the approved template goes (whatsapp_restock_template_id), and
// without one the request waits. Never to a customer who replied STOP.
// Requests lapse after 60 days. Pure: everything live is injected.
import type { Stock } from "@/lib/ai/catalogStock";
import { sizeMatches } from "@/lib/ai/shopAssistant/format";
import { normAttr } from "@/lib/utils/normAttr";
import type { MessagingResult } from "@/lib/messaging/provider";
import { REPLY_WINDOW_MS } from "./pipeline";
import { NOTICE_TYPE } from "./notices";

export const RESTOCK_KEEP_DAYS = 60;
/** Open alerts per conversation. */
export const MAX_OPEN_ALERTS = 5;

/** Whether the piece the customer wants can be bought now. */
export function wantedInStock(stock: Stock | undefined, size: string | null, colour: string | null): boolean {
    if (!stock || stock.tracked === "not_tracked") return true;
    if (stock.tracked === "product") return (stock.available ?? 0) > 0;
    return (stock.options ?? []).some(o => o.available > 0
        && (!size || sizeMatches(o.size, size))
        && (!colour || normAttr(o.colour) === normAttr(colour)));
}

/** The size or colour as the product spells it, or an error naming the ones it has. */
export function pickOption(asked: string, offered: string[] | null, match: (o: string, a: string) => boolean, what: string): { value: string | null } | { error: string } {
    if (!asked) return { value: null };
    const list = offered ?? [];
    if (list.length === 0) return { value: null };
    const hit = list.find(o => match(o, asked));
    return hit ? { value: hit } : { error: `This piece doesn't come in ${what} ${asked}. It comes in: ${list.join(", ")}.` };
}

export const optionWords = (size: string | null, colour: string | null) =>
    [size ? `size ${size}` : null, colour].filter(Boolean).join(", ");

export type RestockRequest = {
    id: string; conversationId: string; productId: string; size: string | null; colour: string | null;
    product: { name: string; slug: string; active: boolean };
    stock: Stock | undefined;
    conversation: { phone: string; name: string | null; optedOut: boolean; lastInboundAt: string | null };
};

const firstName = (name: string | null) => String(name ?? "").trim().split(/\s+/)[0] || "there";
const piece = (r: RestockRequest) => {
    const opt = optionWords(r.size, r.colour);
    return `${r.product.name.trim()}${opt ? ` (${opt})` : ""}`;
};

export function restockText(r: RestockRequest, siteUrl: string): string {
    return `Good news, ${firstName(r.conversation.name)}! ${piece(r)} is back in stock at Miss Tokyo: ${siteUrl}/products/${r.product.slug}\n\nReply here if you'd like to order it.`;
}

/** The template's {{1}} name, {{2}} piece, {{3}} link. */
export function restockPlaceholders(r: RestockRequest, siteUrl: string): string[] {
    return [firstName(r.conversation.name), piece(r), `${siteUrl}/products/${r.product.slug}`];
}

export type RestockOutcome = "sent_text" | "sent_template" | "not_yet" | "waiting_for_template" | "opted_out" | "claimed_elsewhere" | "failed";

export type RestockDeps = {
    /** Lapses requests older than RESTOCK_KEEP_DAYS; returns how many. */
    expireOld: () => Promise<number>;
    pending: () => Promise<RestockRequest[]>;
    /** pending → notified; false if another run got there first. */
    claim: (id: string) => Promise<boolean>;
    /** notified → pending again, after a send that failed. */
    release: (id: string) => Promise<void>;
    sendText: (to: string, text: string) => Promise<MessagingResult>;
    sendTemplate: (to: string, templateId: number, placeholders: string[]) => Promise<MessagingResult>;
    logOutbound: (conversationId: string, text: string, waMessageId: string | null, type?: string) => Promise<void>;
    templateId: number | null;
    siteUrl: string;
    now?: () => number;
};

export async function alertOne(r: RestockRequest, deps: RestockDeps, now: number): Promise<RestockOutcome> {
    if (!r.product.active || !wantedInStock(r.stock, r.size, r.colour)) return "not_yet";
    if (r.conversation.optedOut) return "opted_out";
    const inWindow = !!r.conversation.lastInboundAt && now - Date.parse(r.conversation.lastInboundAt) < REPLY_WINDOW_MS;
    if (!inWindow && !deps.templateId) return "waiting_for_template";
    if (!(await deps.claim(r.id))) return "claimed_elsewhere";
    const text = restockText(r, deps.siteUrl);
    const res = inWindow
        ? await deps.sendText(r.conversation.phone, text)
        : await deps.sendTemplate(r.conversation.phone, deps.templateId!, restockPlaceholders(r, deps.siteUrl));
    if (!res.ok) { await deps.release(r.id); return "failed"; }
    await deps.logOutbound(r.conversationId, text, res.messageId, NOTICE_TYPE);
    return inWindow ? "sent_text" : "sent_template";
}

/** One run. Never throws for one request; counts each outcome. */
export async function runRestockAlerts(deps: RestockDeps): Promise<Partial<Record<RestockOutcome | "expired", number>>> {
    const now = deps.now?.() ?? Date.now();
    const counts: Partial<Record<RestockOutcome | "expired", number>> = {};
    const expired = await deps.expireOld();
    if (expired) counts.expired = expired;
    for (const r of await deps.pending()) {
        let outcome: RestockOutcome;
        try { outcome = await alertOne(r, deps, now); } catch (e) {
            console.error("[whatsapp] restock alert failed", { request: r.id.slice(0, 8), err: String(e) });
            outcome = "failed";
        }
        counts[outcome] = (counts[outcome] ?? 0) + 1;
    }
    return counts;
}
