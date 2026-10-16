// One WhatsApp reminder for an order placed in a WhatsApp chat and not paid.
// Items are held for 15 minutes, so 30 to 60 minutes after placing, the hold
// has gone: the reminder offers to check the pieces and send a new Pay now
// link, never the old one. Sent only inside the 24-hour window (no template
// needed), never to a customer who replied STOP, never while a person has
// the chat, and not when they have placed another order since. Each order is
// claimed before sending, so it is reminded at most once.
import { toDestination } from "@/lib/messaging/chatbotsAfrica";
import type { MessagingResult } from "@/lib/messaging/provider";
import { REPLY_WINDOW_MS } from "./pipeline";
import { orderRef } from "./orderUpdates";
import { NOTICE_TYPE } from "./notices";

export const NUDGE_AFTER_MS = 30 * 60_000;
export const NUDGE_UNTIL_MS = 60 * 60_000;
/** Not this close to the end of the window: the reply would land outside it. */
const WINDOW_MARGIN_MS = 30 * 60_000;

export type NudgeOrder = { id: string; customer_name: string | null; customer_phone: string | null; created_at: string };
export type NudgeConversation = { id: string; optedOut: boolean; handedOff: boolean; lastInboundAt: string | null };
export type NudgeOutcome = "sent" | "claimed_elsewhere" | "no_phone" | "no_chat" | "opted_out" | "with_person" | "outside_window" | "ordered_again" | "failed";

export type NudgeDeps = {
    /** Unpaid WhatsApp orders placed between `from` and `to`, not yet reminded. */
    candidates: (from: Date, to: Date) => Promise<NudgeOrder[]>;
    /** Marks the order reminded; false if another run already did. */
    claim: (orderId: string) => Promise<boolean>;
    conversation: (phone: string) => Promise<NudgeConversation | null>;
    /** Another order on this phone placed after `since` (paid or still waiting). */
    orderedSince: (phone: string, since: string, exceptId: string) => Promise<boolean>;
    sendText: (to: string, text: string) => Promise<MessagingResult>;
    logOutbound: (conversationId: string, text: string, waMessageId: string | null, type?: string) => Promise<void>;
    now?: () => number;
};

const firstName = (o: NudgeOrder) => String(o.customer_name ?? "").trim().split(/\s+/)[0] || "there";

export function nudgeText(o: NudgeOrder): string {
    return `Hi ${firstName(o)}, your Miss Tokyo order ${orderRef(o)} wasn't paid, so we've released the items. ` +
        "Would you like me to check they're still available and send you a new Pay now link? Just reply here.";
}

export async function nudgeOne(o: NudgeOrder, deps: NudgeDeps, now: number): Promise<NudgeOutcome> {
    const to = toDestination(o.customer_phone ?? "");
    if (!to) return "no_phone";
    if (!(await deps.claim(o.id))) return "claimed_elsewhere";
    const conv = await deps.conversation(to);
    if (!conv) return "no_chat";
    if (conv.optedOut) return "opted_out";
    if (conv.handedOff) return "with_person";
    if (!conv.lastInboundAt || now - Date.parse(conv.lastInboundAt) > REPLY_WINDOW_MS - WINDOW_MARGIN_MS) return "outside_window";
    if (await deps.orderedSince(to, o.created_at, o.id)) return "ordered_again";
    const text = nudgeText(o);
    const r = await deps.sendText(to, text);
    if (!r.ok) return "failed";
    await deps.logOutbound(conv.id, text, r.messageId, NOTICE_TYPE);
    return "sent";
}

/** One run: every due order, one at a time. Never throws; a failed order is counted, not retried. */
export async function runUnpaidNudges(deps: NudgeDeps): Promise<Partial<Record<NudgeOutcome, number>>> {
    const now = deps.now?.() ?? Date.now();
    const counts: Partial<Record<NudgeOutcome, number>> = {};
    const orders = await deps.candidates(new Date(now - NUDGE_UNTIL_MS), new Date(now - NUDGE_AFTER_MS));
    for (const o of orders) {
        let outcome: NudgeOutcome;
        try { outcome = await nudgeOne(o, deps, now); } catch (e) {
            console.error("[whatsapp] unpaid nudge failed", { order: o.id.slice(0, 8), err: String(e) });
            outcome = "failed";
        }
        counts[outcome] = (counts[outcome] ?? 0) + 1;
    }
    return counts;
}
