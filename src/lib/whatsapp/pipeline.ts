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
/** A provider clock this far ahead of ours is not trusted: the window runs from when we received it. */
export const MAX_CLOCK_SKEW_MS = 5 * 60_000;
export const NO_PHONE_REASON = "sender without a phone number (hidden or username-only)";

export type InboundMessage = {
    messageId: string | null;
    /** 233XXXXXXXXX (or another international number), "" when the sender's number is hidden. */
    from: string;
    name: string | null;
    type: string;
    text: string | null;
    /** WhatsApp user id ("GH.<digits>"), kept beside the number. */
    fromUserId?: string | null;
    /** When the customer sent it (the provider's timestamp), ISO. */
    at?: string | null;
    mediaId?: string | null;
    mimeType?: string | null;
    /** The message this one replies to (WhatsApp's context.id), if the customer quoted one. */
    replyTo?: string | null;
    /** A button or list tap: the provider's id (Chatbots Africa's own, not ours) and the option's title. */
    tap?: { id: string | null; title: string } | null;
};
/** A delivery or read receipt for a message we sent. */
export type InboundStatus = { messageId: string | null; status: string; at: string | null; recipient: string | null };
export type ParsedInbound = {
    externalId: string | null;
    messages: InboundMessage[];
    statuses?: InboundStatus[];
    /** metadata.phone_number_id values seen, for the soft check against our number. */
    phoneNumberIds?: string[];
    /** Things skipped or odd about the payload, kept with the event. */
    notes?: string[];
};
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
    /** Finds or opens the sender's conversation, moves last_inbound_at forward to `at`, and records the user id. */
    touchConversation(phone: string, name: string | null, at: string, provider: string, userId?: string | null): Promise<Conversation>;
    seen(waMessageId: string): Promise<boolean>;
    /** `at`: when the customer sent it, so the inbox shows it before our reply. */
    logInbound(conversationId: string, m: InboundMessage, at: string): Promise<void>;
    /** `note` is kept in error for a processed event that still needs a look (e.g. a hidden number). */
    markProcessed(id: string, f: Found & { externalId: string | null; parsed: ParsedInbound; note?: string | null }): Promise<void>;
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
    /** Our WhatsApp phone_number_id. A delivery for another number is only warned about, never refused. */
    expectedPhoneNumberId?: string | null;
    /** Runs after a give-up moved the chat to a person (forwards it to the team). Never throws. */
    afterHandOff?: (conversationId: string) => Promise<void>;
    now?: () => Date;
};

export type ProcessOutcome = "skipped" | "processed" | "failed" | "gave_up";

const digits = (s: string) => String(s ?? "").replace(/\D/g, "");
const age = (now: Date, iso: string) => now.getTime() - new Date(iso).getTime();

/** When the customer sent it: their timestamp unless missing or ahead of our clock, else when we received it. */
export function messageTime(at: string | null | undefined, receivedAt: string): string {
    const t = at ? new Date(at).getTime() : NaN;
    const r = new Date(receivedAt).getTime();
    return Number.isFinite(t) && t <= r + MAX_CLOCK_SKEW_MS ? new Date(t).toISOString() : receivedAt;
}

export async function processInboundEvent(id: string, deps: PipelineDeps): Promise<ProcessOutcome> {
    const now = deps.now?.() ?? new Date();
    const ev = await deps.store.claim(id, now);
    if (!ev) return "skipped";

    const found: Found = { waPhone: null, conversationId: null };
    let conversation: Conversation | null = null;
    try {
        const parsed = deps.parse(ev.raw_body, ev.headers);
        const notes = [...(parsed.notes ?? [])];
        const expected = deps.expectedPhoneNumberId;
        if (expected && (parsed.phoneNumberIds ?? []).some(id => id !== expected)) {
            console.warn("[whatsapp] delivery for another phone_number_id; processed anyway", { event: ev.id });
            notes.push("phone_number_id is not ours");
        }
        for (const m of parsed.messages) {
            const phone = digits(m.from);
            // Conversations are keyed on the number. A hidden one is kept with the event and shown to staff.
            if (!phone) { if (!notes.includes(NO_PHONE_REASON)) notes.push(NO_PHONE_REASON); continue; }
            found.waPhone = phone;
            // The window is tracked before anything can fail, so it is known even for a message we could not answer.
            conversation = await deps.store.touchConversation(phone, m.name, messageTime(m.at, ev.received_at), ev.provider, m.fromUserId ?? null);
            found.conversationId = conversation.id;
            if (m.messageId && await deps.store.seen(m.messageId)) continue;
            if (!conversation.handedOffAt) await deps.handle(m, conversation);
            await deps.store.logInbound(conversation.id, m, messageTime(m.at, ev.received_at));
        }
        await deps.store.markProcessed(ev.id, { ...found, externalId: parsed.externalId, parsed: { ...parsed, notes }, note: notes.includes(NO_PHONE_REASON) ? NO_PHONE_REASON : null });
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
            if (moved) await deps.afterHandOff?.(conversation.id).catch(() => undefined);
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
