// A photo sent on its own, then a question a few seconds later ("Do you have
// this?"), arrive as two messages and are processed in parallel. Answered
// apart, the question's turn has no photo ("I can't see a photo") and the
// photo's turn loses the save to it. So a photo without a caption is carried
// by the customer's next text when that text arrives within PAIR_WINDOW_MS,
// and both are answered in one turn.
//
// Both sides decide from the same stored receive times, so exactly one turn
// answers each photo: the photo's turn waits out the window and stands down
// when a text arrived inside it; the text's turn takes the bare photos that
// arrived inside the window before it.
//
// Pure: the event reader, parser, clock and sleep are passed in.
import type { InboundMessage, InboundParser } from "./pipeline";

export const PAIR_WINDOW_MS = 12_000;
/** How long after the window a text's stored row is trusted to be visible. */
export const PAIR_SETTLE_MS = 2_000;
/** Photos one text carries into the model, the latest ones. */
export const MAX_PAIRED_PHOTOS = 4;

type Stored = { receivedAt: string; rawBody: string };
export type PairingDeps = {
    /** Stored message events from this number received in (fromIso, toIso), any order. May include others. */
    eventsBetween: (fromIso: string, toIso: string, phone: string) => Promise<Stored[]>;
    parse: InboundParser;
    now?: () => Date;
    sleep?: (ms: number) => Promise<void>;
};

const digits = (s: string | null | undefined) => String(s ?? "").replace(/\D/g, "");
const ms = (iso: string) => new Date(iso).getTime();

/** A photo with no words and something to fetch. */
export const isBarePhoto = (m: InboundMessage) => m.type === "image" && !!m.mediaId && !(m.text ?? "").trim();

/** Typed text that can carry a photo; STOP/START keep their own meaning. */
export const canCarryPhoto = (m: InboundMessage) =>
    m.type === "text" && !!(m.text ?? "").trim() && !/^\s*(stop|unsubscribe|start|subscribe)\s*[.!]?\s*$/i.test(m.text ?? "");

function messagesIn(events: Stored[], parse: InboundParser): { m: InboundMessage; receivedAt: string }[] {
    const out: { m: InboundMessage; receivedAt: string }[] = [];
    for (const e of events) {
        try { for (const m of parse(e.rawBody, {}).messages) out.push({ m, receivedAt: e.receivedAt }); } catch { /* unreadable: not a pair */ }
    }
    return out;
}

/** For a bare photo: waits out the window, then true when a text from the same sender arrived inside it. */
export async function textFollows(photo: InboundMessage, receivedAt: string, deps: PairingDeps): Promise<boolean> {
    if (!isBarePhoto(photo) || !digits(photo.from)) return false;
    const now = deps.now?.() ?? new Date();
    const wait = ms(receivedAt) + PAIR_WINDOW_MS + PAIR_SETTLE_MS - now.getTime();
    if (wait > 0) await (deps.sleep ?? (t => new Promise(r => setTimeout(r, t))))(wait);
    const until = new Date(ms(receivedAt) + PAIR_WINDOW_MS + 1).toISOString();
    const events = await deps.eventsBetween(receivedAt, until, digits(photo.from));
    return messagesIn(events, deps.parse).some(({ m, receivedAt: at }) =>
        ms(at) > ms(receivedAt) && digits(m.from) === digits(photo.from) && canCarryPhoto(m));
}

/** For a text: the bare photos from the same sender that arrived inside the window before it, oldest first. */
export async function photosBefore(text: InboundMessage, receivedAt: string, deps: PairingDeps): Promise<InboundMessage[]> {
    if (!canCarryPhoto(text) || !digits(text.from)) return [];
    const from = new Date(ms(receivedAt) - PAIR_WINDOW_MS - 1).toISOString();
    const events = await deps.eventsBetween(from, receivedAt, digits(text.from));
    const seen = new Set<string>();
    return messagesIn(events, deps.parse)
        .filter(({ m, receivedAt: at }) => ms(at) < ms(receivedAt) && ms(receivedAt) - ms(at) <= PAIR_WINDOW_MS
            && digits(m.from) === digits(text.from) && isBarePhoto(m))
        .sort((a, b) => ms(a.receivedAt) - ms(b.receivedAt))
        .map(p => p.m)
        .filter(m => { const k = m.mediaId!; if (seen.has(k)) return false; seen.add(k); return true; })
        .slice(-MAX_PAIRED_PHOTOS);
}
