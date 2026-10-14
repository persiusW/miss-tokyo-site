// Processing of stored WhatsApp callbacks (inbound_events). Chatbots Africa
// never retries, so each stored event is the only copy of a customer's
// message: it is processed right after capture, and a sweep retries what
// failed, up to MAX_ATTEMPTS and only while it is under 20 hours old. An
// event that still fails is given up, its conversation goes to a person, and
// the customer gets one short note (inside WhatsApp's 24-hour window only).
//
// Handling is at least once: a message is logged to message_log only after it
// is handled, so a crash mid-way retries it (a possible double reply) rather
// than losing it. message_log's unique wa_message_id stops replays and test
// posts being handled twice.
//
// Pure: the database, parser, handler and sender are passed in.
import type { MessagingResult } from "@/lib/messaging/provider";

export const MAX_ATTEMPTS = 5;
/** A sweep leaves an event alone this long after its last try. */
export const RETRY_AFTER_MS = 2 * 60_000;
/** The sweep only retries events younger than this: a reply must still land inside the 24h window. */
export const REPROCESS_WINDOW_MS = 20 * 3600_000;
/** WhatsApp's customer-service window: free-form messages only within 24h of the customer's last message. */
export const REPLY_WINDOW_MS = 24 * 3600_000;
export const FALLBACK_TEXT = "Thanks for your message. A member of our team will reply to you here shortly.";

export type InboundMessage = { messageId: string | null; from: string; name: string | null; type: string; text: string | null };
export type ParsedInbound = { externalId: string | null; messages: InboundMessage[] };
/** Throws when the body cannot be read; returns no messages for receipts and other non-message events. */
export type InboundParser = (rawBody: string, headers: Record<string, string>) => ParsedInbound;

export type InboundEvent = {
    id: string; provider: string; raw_body: string; headers: Record<string, string>;
    received_at: string; attempts: number; last_attempt_at: string | null;
    processed_at: string | null; gave_up_at: string | null;
};
export type Conversation = { id: string; handedOffAt: string | null };
type Found = { waPhone: string | null; conversationId: string | null };

export interface InboundStore {
    /** Takes the event for one attempt (attempts + 1), or null when it is done, given up or tried too recently. */
    claim(id: string, now: Date): Promise<InboundEvent | null>;
    /** Finds or opens the sender's conversation and moves last_inbound_at forward to receivedAt. */
    touchConversation(phone: string, name: string | null, receivedAt: string, provider: string): Promise<Conversation>;
    seen(waMessageId: string): Promise<boolean>;
    logInbound(conversationId: string, m: InboundMessage): Promise<void>;
    markProcessed(id: string, f: Found & { externalId: string | null; parsed: ParsedInbound }): Promise<void>;
    markFailed(id: string, error: string, f: Found): Promise<void>;
    giveUp(id: string, error: string, f: Found): Promise<void>;
    /** Moves the conversation to a person. True only for the call that made the move. */
    handOff(conversationId: string, reason: string, now: Date): Promise<boolean>;
    /** Events the sweep should retry now, oldest first. */
    listPending(now: Date, limit: number): Promise<string[]>;
    /** Gives up events past the reprocessing window that were never finished. Returns how many. */
    expireStale(now: Date): Promise<number>;
}

export type PipelineDeps = {
    store: InboundStore;
    parse: InboundParser;
    /** Answers one new message. Not called for duplicates or conversations a person holds. */
    handle: (m: InboundMessage, c: Conversation) => Promise<void>;
    sendFallback: (to: string) => Promise<MessagingResult>;
    now?: () => Date;
};

export type ProcessOutcome = "skipped" | "processed" | "failed" | "gave_up";

const digits = (s: string) => String(s ?? "").replace(/\D/g, "");
const age = (now: Date, iso: string) => now.getTime() - new Date(iso).getTime();

export async function processInboundEvent(id: string, deps: PipelineDeps): Promise<ProcessOutcome> {
    const now = deps.now?.() ?? new Date();
    const ev = await deps.store.claim(id, now);
    if (!ev) return "skipped";

    const found: Found = { waPhone: null, conversationId: null };
    let conversation: Conversation | null = null;
    try {
        const parsed = deps.parse(ev.raw_body, ev.headers);
        for (const m of parsed.messages) {
            const phone = digits(m.from);
            if (!phone) throw new Error("message without a sender");
            found.waPhone = phone;
            // The window is tracked before anything can fail, so it is known even for a message we could not answer.
            conversation = await deps.store.touchConversation(phone, m.name, ev.received_at, ev.provider);
            found.conversationId = conversation.id;
            if (m.messageId && await deps.store.seen(m.messageId)) continue;
            if (!conversation.handedOffAt) await deps.handle(m, conversation);
            await deps.store.logInbound(conversation.id, m);
        }
        await deps.store.markProcessed(ev.id, { ...found, externalId: parsed.externalId, parsed });
        return "processed";
    } catch (e) {
        const error = String(e instanceof Error ? e.message : e).slice(0, 500);
        if (ev.attempts < MAX_ATTEMPTS && age(now, ev.received_at) < REPROCESS_WINDOW_MS) {
            await deps.store.markFailed(ev.id, error, found);
            return "failed";
        }
        await deps.store.giveUp(ev.id, error, found);
        if (conversation && found.waPhone) {
            const moved = await deps.store.handOff(conversation.id, "processing_failed", now);
            // One note per handoff, and only while WhatsApp still allows a free-form reply.
            if (moved && age(now, ev.received_at) < REPLY_WINDOW_MS) {
                await deps.sendFallback(found.waPhone).catch(() => null);
            }
        }
        return "gave_up";
    }
}

/** One sweep pass: retry what is due, oldest first, inside a time budget; then give up what aged out. */
export async function sweepInbound(deps: PipelineDeps, opts: { limit: number; budgetMs: number }) {
    const started = Date.now();
    const now = deps.now?.() ?? new Date();
    const ids = await deps.store.listPending(now, opts.limit);
    const counts: Record<ProcessOutcome, number> = { skipped: 0, processed: 0, failed: 0, gave_up: 0 };
    for (const id of ids) {
        if (Date.now() - started > opts.budgetMs) break;
        counts[await processInboundEvent(id, deps)]++;
    }
    const expired = await deps.store.expireStale(now);
    return { due: ids.length, ...counts, expired };
}
