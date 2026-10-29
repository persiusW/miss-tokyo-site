// Staff messages that wait for the customer. WhatsApp only delivers free text
// within 24 hours of the customer's last message, so a reply from the inbox
// or an order note written later is kept, and the customer gets an approved
// template asking them to reply (team_follow_up, or order_message_waiting
// for an order). Their next message delivers every waiting note, oldest
// first, before the assistant could answer, and the chat stays with the team.
// A second note while one waits asks nothing more. Notes older than a week
// are not sent: by then they are likely stale. Pure: everything live is
// injected (pendingNotesLive.ts).
import type { MessagingResult } from "@/lib/messaging/provider";
import type { NoticeOutcome, TemplateChoice } from "./templateSend";

export const NOTE_TTL_MS = 7 * 24 * 3600_000;

export type LateNoteKind = "follow_up" | "order_note";
export type PendingNote = {
    id: string; kind: LateNoteKind; body: string; orderId: string | null;
    staffId: string | null; staffName: string | null; createdAt: string;
};

/** The template that asks the customer to reply. */
export function lateNoteChoice(kind: LateNoteKind, firstName: string, orderRef?: string | null): TemplateChoice {
    return kind === "order_note" && orderRef
        ? { key: "order_message_waiting", values: [firstName, orderRef] }
        : { key: "team_follow_up", values: [firstName] };
}

export type QueueDeps = {
    /** Notes for this chat still waiting (not delivered, not past NOTE_TTL_MS). */
    waiting: (conversationId: string, since: Date) => Promise<number>;
    insert: (n: Omit<PendingNote, "id" | "createdAt"> & { conversationId: string }) => Promise<string>;
    remove: (id: string) => Promise<void>;
    /** Sends the template to the customer; logged in the inbox as a notice. */
    ask: (choice: TemplateChoice) => Promise<NoticeOutcome | "off">;
    now?: () => number;
};

export type QueueResult = { ok: true; asked: boolean } | { ok: false; error: string; status: number };

const ERR: Partial<Record<NoticeOutcome | "off", [string, number]>> = {
    off: ["WhatsApp is switched off for the shop. Message them from your WhatsApp phone instead.", 409],
    opted_out: ["This customer asked not to get WhatsApp messages.", 409],
    no_template: ["Their last message was over 24 hours ago and the WhatsApp template that asks them to reply isn't set up yet. Reply from your WhatsApp phone instead.", 409],
};

export async function queueLateNote(
    a: { conversationId: string; kind: LateNoteKind; body: string; orderId?: string | null; staffId: string | null; staffName: string | null; choice: TemplateChoice },
    deps: QueueDeps,
): Promise<QueueResult> {
    const now = deps.now?.() ?? Date.now();
    const already = await deps.waiting(a.conversationId, new Date(now - NOTE_TTL_MS));
    const id = await deps.insert({ conversationId: a.conversationId, kind: a.kind, body: a.body, orderId: a.orderId ?? null, staffId: a.staffId, staffName: a.staffName });
    // They have already been asked to reply: this note goes with the one waiting.
    if (already > 0) return { ok: true, asked: false };
    const r = await deps.ask(a.choice);
    if (r === "sent_template" || r === "sent_text") return { ok: true, asked: true };
    await deps.remove(id);
    const [error, status] = ERR[r] ?? ["WhatsApp didn't take that message. Please try again.", 502];
    return { ok: false, error, status };
}

export type DeliverDeps = {
    /** Marks this chat's waiting notes (created after `since`) delivered and returns them, oldest first. Only one caller gets them. */
    claim: (conversationId: string, since: Date) => Promise<PendingNote[]>;
    /** Puts notes back to waiting: their send failed. */
    unclaim: (ids: string[]) => Promise<void>;
    send: (phone: string, note: PendingNote) => Promise<MessagingResult>;
    log: (conversationId: string, note: PendingNote, waMessageId: string | null) => Promise<void>;
    /** The chat goes to the team (they hear about it) and the assistant stays quiet in it. */
    toTeam: (conversationId: string) => Promise<void>;
    now?: () => number;
};

/** Sends the waiting notes; returns how many went. A note that fails waits for the next message. */
export async function deliverPendingNotes(conversationId: string, phone: string, deps: DeliverDeps): Promise<number> {
    const now = deps.now?.() ?? Date.now();
    const notes = await deps.claim(conversationId, new Date(now - NOTE_TTL_MS));
    let sent = 0;
    for (const [i, n] of notes.entries()) {
        const r = await deps.send(phone, n).catch(() => ({ ok: false }) as MessagingResult);
        if (!r.ok) { await deps.unclaim(notes.slice(i).map(x => x.id)).catch(() => undefined); break; }
        sent++;
        await deps.log(conversationId, n, r.messageId).catch(e => console.error("[whatsapp] waiting note sent but not logged", { err: String(e) }));
    }
    if (sent > 0) await deps.toTeam(conversationId);
    return sent;
}
