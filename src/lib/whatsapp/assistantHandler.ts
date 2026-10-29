// A new WhatsApp message, once the pipeline has stored and deduplicated it.
// Text, photos and taps on our own buttons go to Ask Miss Tokyo and the reply
// comes back as one WhatsApp text (or a tappable question, ending the turn).
// Anything else (voice notes, files, locations) goes to a person and the
// customer is told once that only text is read for now. A photo sent without
// words is answered with the text that follows it, when one does (photoPairing).
//
// A person takes the chat when the customer asks for one (the assistant's
// "talk to us"), when the assistant fails, or at the daily limit. The
// assistant keeps answering while the team has the chat (stock, prices,
// orders) and knows they have it; asking for a person again gets "our team
// has your message" at most every 6 hours, and the team is alerted again when
// the customer writes after an hour. Back with the assistant when staff hand
// it back, or after 24 hours.
//
// A reply that could not be sent is not retried (that would run the model
// again): the chat goes to a person instead, so the message is never ignored.
import { cleanCustomerText, visitorLimit, WA_PER_MINUTE } from "@/lib/ai/shopAssistant/limits";
import type { ShopRunResult } from "@/lib/ai/shopAssistant/run";
import type { ShopChat } from "@/lib/ai/shopAssistant/types";
import type { MessagingResult } from "@/lib/messaging/provider";
import { WA_LIMITS } from "@/lib/messaging/chatbotsAfrica";
import { numberedText, offeredText, tapText, type ChoicePlan } from "./choices";
import { withNotice } from "./notices";
import type { ModelPhoto } from "./photo";
import type { HandoffReason } from "./handoff";
import type { Conversation, InboundMessage } from "./pipeline";
import { canCarryPhoto, isBarePhoto, MAX_PAIRED_PHOTOS } from "./photoPairing";
import { handedOffLine, renderForWhatsApp, WA_LINES, type WhatsAppReply } from "./render";

export type AssistantDeps = {
    send: (to: string, text: string) => Promise<MessagingResult>;
    sendImage: (to: string, url: string, caption: string) => Promise<MessagingResult>;
    /** A tappable question: reply buttons or a list. */
    sendChoices: (to: string, plan: ChoicePlan) => Promise<MessagingResult>;
    /** Our last message, when it was an order update or reminder the assistant never wrote. */
    notice: (conversationId: string) => Promise<string | null>;
    /** The options we offered on one of our messages in this conversation; [] when it wasn't an offer. */
    offered: (conversationId: string, waMessageId: string) => Promise<string[]>;
    /** True only for the call that moved the chat to a person (it also forwards the chat to the team). */
    handOff: (conversationId: string, reason: HandoffReason) => Promise<boolean>;
    /** mediaUrl: the public link of a photo we sent, so the inbox shows it. */
    logOutbound: (conversationId: string, text: string, waMessageId: string | null, type?: string, mediaUrl?: string | null) => Promise<void>;
    chatFor: (c: Conversation, phone: string) => Promise<{ chat: ShopChat; customerId: string | null }>;
    /** Order updates off (STOP) or back on (START) for this conversation. */
    setOptOut: (conversationId: string, optedOut: boolean) => Promise<void>;
    /** What a quoted message said, from our own records for this conversation. */
    quoted: (conversationId: string, waMessageId: string) => Promise<string | null>;
    counts: (chat: ShopChat) => Promise<{ lastMinute: number; today: number } | null>;
    perDay: number;
    /**
     * withTeam: a person has the chat; the assistant answers what it can and leaves the rest to them.
     * staffNote: what staff told the assistant for this chat (Tell the assistant).
     */
    run: (a: {
        chat: ShopChat; text: string; phone: string; customerId: string | null; conversationId: string; images: ModelPhoto[];
        withTeam?: boolean; staffNote?: string | null;
    }) => Promise<ShopRunResult>;
    /** The number staff reply from, named in the handover line. */
    teamNumber?: string | null;
    /** The customer wrote while the team has the chat: alert the team again if the last alert is an hour old. Never throws. */
    withTeam?: (c: Conversation) => Promise<void>;
    /** Runs one assistant turn holding the chat's turn lock, so two messages never answer at once. */
    turnLock?: (conversationId: string, fn: () => Promise<void>) => Promise<void>;
    /** True when "our team has your message" may be sent now (at most every 6 hours); records it. */
    referToTeam?: (conversationId: string) => Promise<boolean>;
    /** A customer's photo, ready for the model; null when it can't be fetched or isn't an image. */
    fetchPhoto: (mediaId: string) => Promise<ModelPhoto | null>;
    /** Bare photo: waits out the pairing window; true when a text that arrived inside it will answer the photo. */
    textFollows?: (m: InboundMessage, receivedAt: string) => Promise<boolean>;
    /** Text: the bare photos it answers, oldest first. Throws when they can't be read, so the text is retried. */
    carriedBefore?: (m: InboundMessage, receivedAt: string) => Promise<{ texts: InboundMessage[]; photos: InboundMessage[] }>;
    /** Text: waits out the burst window; true when the sender's next text came inside it (that one answers both). */
    textFollowsSoon?: (m: InboundMessage, receivedAt: string) => Promise<boolean>;
    /**
     * Messages staff left while the customer's window was shut (pendingNotes.ts): sends them and
     * gives the chat to the team. Returns how many went; when any did, the assistant doesn't answer.
     */
    deliverNotes?: (c: Conversation, phone: string) => Promise<number>;
    siteUrl: string;
};

/**
 * "[tapped: …]", "[Replying to: …]" and "[We messaged you: …]" are written by us and trusted by the
 * model, so customer text never carries them. Stripped until stable: removing
 * one can join the text around it into another.
 */
export function stripOurMarkers(text: string): string {
    let out = text;
    for (;;) {
        const next = out.replace(/\[\s*(tapped|replying\s+to|we\s+messaged\s+you)\s*:[^\]]*(\]|$)/gi, "");
        if (next === out) return out.trim();
        out = next;
    }
}

/** The turn's message when staff told the assistant something (the note itself is in the facts). */
export const TELL_TEXT = "(Our team has given you a note about this chat. Reply to the customer now, following it.)";

export function createWhatsAppHandler(deps: AssistantDeps) {
    async function reply(c: Conversation, to: string, text: string): Promise<boolean> {
        const r = await deps.send(to, text);
        if (r.ok) await deps.logOutbound(c.id, text, r.messageId);
        else console.error("[whatsapp] reply not sent", { code: r.code });
        return r.ok;
    }

    async function toPerson(c: Conversation, to: string, reason: HandoffReason, said: string | null): Promise<void> {
        if (c.handedOffAt) {
            // Already with the team: no second handover, and the reminder that they have it is rationed.
            const refer = await deps.referToTeam?.(c.id).catch(() => false);
            const text = [said, refer ? WA_LINES.teamHasIt : null].filter(Boolean).join("\n\n");
            if (text) await reply(c, to, text);
            return;
        }
        const moved = await deps.handOff(c.id, reason);
        const text = [said, moved ? handedOffLine(deps.teamNumber) : null].filter(Boolean).join("\n\n");
        if (text) await reply(c, to, text);
    }

    // Product photos after a reply. A photo that fails is only logged: the text already has the links.
    async function sendImages(c: Conversation, to: string, out: WhatsAppReply): Promise<void> {
        for (const img of out.images) {
            const r = await deps.sendImage(to, img.url, img.caption);
            if (r.ok) await deps.logOutbound(c.id, img.caption, r.messageId, "image", img.url);
            else console.error("[whatsapp] product photo not sent", { code: r.code });
        }
    }

    // The reply and photos first, the question last, so it is the message to tap.
    // One message when it fits; buttons that won't send go as numbered text.
    async function ask(c: Conversation, to: string, out: WhatsAppReply, plan: ChoicePlan): Promise<void> {
        const joined = out.text ? `${out.text}\n\n${plan.question}` : plan.question;
        const together = out.images.length === 0 && joined.length <= WA_LIMITS.interactiveBody;
        if (!together) {
            if (out.text && !(await reply(c, to, out.text))) { await deps.handOff(c.id, "assistant_failed"); return; }
            await sendImages(c, to, out);
        }
        const q: ChoicePlan = together ? { ...plan, question: joined } : plan;
        const r = await deps.sendChoices(to, q);
        if (r.ok) { await deps.logOutbound(c.id, offeredText(q), r.messageId, "interactive"); return; }
        console.error("[whatsapp] choices not sent", { kind: q.kind, code: r.code });
        if (!(await reply(c, to, numberedText(q)))) await deps.handOff(c.id, "assistant_failed");
    }

    async function notReadable(c: Conversation, m: InboundMessage): Promise<void> {
        if (c.handedOffAt) return m.from ? toPerson(c, m.from, "unsupported_message", null) : undefined;
        const moved = await deps.handOff(c.id, "unsupported_message");
        if (moved && m.from) await reply(c, m.from, WA_LINES.textOnly);
    }

    async function fetchAll(mediaIds: string[]): Promise<ModelPhoto[]> {
        const got = await Promise.all(mediaIds.map(id => deps.fetchPhoto(id).catch(() => null)));
        return got.filter((p): p is ModelPhoto => !!p);
    }

    /** One turn of the assistant on what the customer said, and the reply sent. */
    async function answer(c: Conversation, from: string, text: string, photos: ModelPhoto[], replyTo: string | null, staffNote: string | null = null): Promise<void> {
        const turn = () => answerNow(c, from, text, photos, replyTo, staffNote);
        return deps.turnLock ? deps.turnLock(c.id, turn) : turn();
    }

    async function answerNow(c: Conversation, from: string, text: string, photos: ModelPhoto[], replyTo: string | null, staffNote: string | null): Promise<void> {
        // The quote comes from our records, never from the customer, so the model may trust it.
        const quote = replyTo ? await deps.quoted(c.id, replyTo).catch(() => null) : null;
        // Otherwise, an order update or reminder they may be answering, also from our records.
        const notice = quote ? null : await deps.notice(c.id).catch(() => null);
        const said = quote ? `[Replying to: "${quote}"]\n${text}` : notice ? withNotice(notice, text) : text;

        const { chat, customerId } = await deps.chatFor(c, from);
        const counts = await deps.counts(chat);
        if (!counts) return toPerson(c, from, "assistant_failed", WA_LINES.cantChat);
        // The day's allowance goes to a person; a fast burst only slows down, the chat stays here.
        const limit = visitorLimit({ ...counts, perDay: deps.perDay, perMinute: WA_PER_MINUTE });
        if (limit === "day") return toPerson(c, from, "daily_limit", WA_LINES.limit);
        if (limit === "minute") { await reply(c, from, WA_LINES.pace); return; }

        const result = await deps.run({ chat, text: said, phone: from, customerId, conversationId: c.id, images: photos, withTeam: !!c.handedOffAt, staffNote });
        const out = renderForWhatsApp(result.reply, result.buttons, deps.siteUrl);
        if (result.failed) return toPerson(c, from, "assistant_failed", out.text);
        if (out.wantsPerson) return toPerson(c, from, result.handoff ?? "customer_asked", out.text);
        if (result.choices) return ask(c, from, out, result.choices);
        if (!(await reply(c, from, out.text))) { await deps.handOff(c.id, "assistant_failed"); return; }
        await sendImages(c, from, out);
    }

    const photoLine = (n: number) => (n > 1 ? "(The customer sent these photos.)" : "(The customer sent this photo.)");

    /**
     * Messages that came in while a person had the chat and got no reply from us, answered in one
     * turn when staff hand the chat back. Their texts in order, their latest photos.
     */
    async function answerWaiting(waiting: InboundMessage[], c: Conversation): Promise<void> {
        const from = waiting.find(m => m.from)?.from;
        if (!from || waiting.length === 0) return;
        const shots = waiting.filter(m => m.type === "image" && m.mediaId).slice(-MAX_PAIRED_PHOTOS);
        const photos = await fetchAll(shots.map(m => m.mediaId!));
        if (shots.length > 0 && photos.length === 0) return notReadable(c, shots[shots.length - 1]);
        const lines = waiting
            .map(m => (m.type === "interactive" && m.tap ? m.tap.title : m.type === "text" || m.type === "image" ? m.text ?? "" : ""))
            .map(t => cleanCustomerText(stripOurMarkers(t)) ?? "")
            .filter(Boolean);
        const text = lines.join("\n") || (photos.length > 0 ? photoLine(photos.length) : "");
        if (!text) return;
        await answer(c, from, text, photos, null);
    }

    /** receivedAt: when we stored the message; without it photos are not paired. */
    const handle = async (m: InboundMessage, c: Conversation, receivedAt?: string): Promise<void> => {
        // The team has the chat and the customer wrote: they hear about it (rationed to once an hour),
        // alongside the reply rather than before it.
        const alerting = c.handedOffAt ? deps.withTeam?.(c).catch(() => undefined) : undefined;
        // The team left a message while the window was shut: this reply opens it, so it goes now and the team takes the chat.
        // STOP / START are answered as always (a note never goes to someone opting out).
        if (deps.deliverNotes && m.from && !/^\s*(stop|unsubscribe|start|subscribe)\s*[.!]?\s*$/i.test(m.text ?? "")
            && (await deps.deliverNotes(c, m.from).catch(e => { console.error("[whatsapp] waiting notes not sent", { err: String(e) }); return 0; })) > 0) {
            await alerting;
            return;
        }
        // Staff are replying in this chat themselves: the assistant stays out of it.
        if (c.quiet) { await alerting; return; }
        try { await respond(m, c, receivedAt); } finally { await alerting; }
    };

    const respond = async (m: InboundMessage, c: Conversation, receivedAt?: string): Promise<void> => {
        // Photos are read (a screenshot's SKU, or the style and colour); voice notes, files and the rest go to a person.
        let photos: ModelPhoto[] = [];
        let tapped: string | null = null;   // "[tapped: …]": an option we offered, so ours
        let typed = m.text ?? "";
        if (m.type === "interactive" && m.tap) {
            // A tap answers the question it was tapped on; any other title reads as if typed.
            const offered = m.replyTo ? await deps.offered(c.id, m.replyTo).catch(() => []) : [];
            const t = tapText(m.tap.title, offered);
            if (t === m.tap.title) typed = m.tap.title; else tapped = t;
        } else if (m.type === "image") {
            // The customer's next text answers it. On an error, answer it here: a double reply, never a lost photo.
            if (receivedAt && isBarePhoto(m) && await deps.textFollows?.(m, receivedAt).catch(() => false)) return;
            photos = m.mediaId ? await fetchAll([m.mediaId]) : [];
            if (photos.length === 0) return notReadable(c, m);
        } else if (m.type !== "text") {
            return notReadable(c, m);
        } else if (receivedAt && deps.carriedBefore) {
            // A quick burst of texts is one question: the last of them answers. On an error, answer here.
            if (canCarryPhoto(m) && await deps.textFollowsSoon?.(m, receivedAt).catch(() => false)) return;
            const carried = await deps.carriedBefore(m, receivedAt);
            if (carried.photos.length > 0) {
                photos = await fetchAll(carried.photos.map(p => p.mediaId!));
                if (photos.length === 0) return notReadable(c, carried.photos[carried.photos.length - 1]);
            }
            if (carried.texts.length > 0) typed = [...carried.texts.map(t => t.text ?? ""), typed].filter(t => t.trim()).join("\n");
        }
        const photo = photos.length > 0;
        if (!m.from) return;
        const raw = tapped ?? stripOurMarkers(typed);
        const caption = cleanCustomerText(raw) ?? cleanCustomerText(raw.slice(0, 1000)) ?? "";
        if (!caption && !photo) return;
        // STOP / START: order updates off or on, answered without the assistant.
        if (!photo && !m.tap && /^\s*(stop|unsubscribe)\s*[.!]?\s*$/i.test(caption)) {
            await deps.setOptOut(c.id, true);
            await reply(c, m.from, WA_LINES.stopped);
            return;
        }
        if (!photo && !m.tap && /^\s*(start|subscribe)\s*[.!]?\s*$/i.test(caption)) {
            await deps.setOptOut(c.id, false);
            await reply(c, m.from, WA_LINES.started);
            return;
        }
        // A tap's context is the question it answers, already in the chat; it is not a quote.
        await answer(c, m.from, caption || photoLine(photos.length), photos, m.tap ? null : m.replyTo ?? null);
    };
    /** Tell the assistant: staff gave it a note for this chat; it answers the customer now with it. */
    async function answerWithNote(c: Conversation, from: string, note: string): Promise<void> {
        await answer(c, from, TELL_TEXT, [], null, note);
    }

    return Object.assign(handle, { answerWaiting, answerWithNote });
}
