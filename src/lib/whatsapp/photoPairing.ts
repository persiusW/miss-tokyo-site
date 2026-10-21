// A photo sent on its own, then a question a few seconds later ("Do you have
// this?"), arrive as two messages and are processed in parallel. Answered
// apart, the question's turn has no photo ("I can't see a photo") and the
// photo's turn loses the save to it. So a photo without a caption is carried
// by the customer's next text when that text arrives within PAIR_WINDOW_MS,
// and both are answered in one turn.
//
// Both sides decide from the same stored receive times, so exactly one turn
// answers each photo: the photo's turn waits out the window and stands down
// when a text arrived inside it; that text's burst (below) carries it.
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

/** For a text: the bare photos it answers (see carriedBefore), oldest first. */
export async function photosBefore(text: InboundMessage, receivedAt: string, deps: PairingDeps): Promise<InboundMessage[]> {
    return (await carriedBefore(text, receivedAt, deps)).photos;
}

// ── Bursts of texts ───────────────────────────────────────────────────────────
// "Hi" / "I want this" / "size M" typed in a few seconds are one question. A
// text stands down when the same sender's next text came within BURST_MS; the
// last text of the burst (the chain) carries the earlier ones, and the bare
// photos whose first following text is in the chain. Same rule both sides.

export const BURST_MS = 2_500;
/** How long after the burst window a following text's stored row is trusted to be visible. */
export const BURST_SETTLE_MS = 1_000;
/** How far back a chain is looked for. */
const LOOKBACK_MS = 90_000;

/** For a text: waits out the burst window; true when the same sender's next text came inside it (that one answers). */
export async function textFollowsSoon(text: InboundMessage, receivedAt: string, deps: PairingDeps): Promise<boolean> {
    if (!canCarryPhoto(text) || !digits(text.from)) return false;
    const now = deps.now?.() ?? new Date();
    const wait = ms(receivedAt) + BURST_MS + BURST_SETTLE_MS - now.getTime();
    if (wait > 0) await (deps.sleep ?? (t => new Promise(r => setTimeout(r, t))))(wait);
    const until = new Date(ms(receivedAt) + BURST_MS + 1).toISOString();
    const events = await deps.eventsBetween(receivedAt, until, digits(text.from));
    return messagesIn(events, deps.parse).some(({ m, receivedAt: at }) =>
        ms(at) > ms(receivedAt) && digits(m.from) === digits(text.from) && canCarryPhoto(m) && m.messageId !== text.messageId);
}

/**
 * For the text that answers: the earlier texts of its burst (oldest first) and the bare photos it
 * answers: those whose first following text from the sender is this text or one of its burst.
 */
export async function carriedBefore(text: InboundMessage, receivedAt: string, deps: PairingDeps): Promise<{ texts: InboundMessage[]; photos: InboundMessage[] }> {
    if (!canCarryPhoto(text) || !digits(text.from)) return { texts: [], photos: [] };
    const from = new Date(ms(receivedAt) - LOOKBACK_MS).toISOString();
    const seen = new Set<string>();
    const mine = messagesIn(await deps.eventsBetween(from, receivedAt, digits(text.from)), deps.parse)
        .filter(({ m, receivedAt: at }) => ms(at) < ms(receivedAt) && digits(m.from) === digits(text.from))
        .filter(({ m }) => { const k = m.messageId ?? `${m.type}:${m.mediaId ?? m.text}`; if (seen.has(k)) return false; seen.add(k); return true; })
        .sort((a, b) => ms(a.receivedAt) - ms(b.receivedAt));

    // The chain: walk back from this text while each earlier carrying text is within BURST_MS of the next.
    const texts = mine.filter(x => canCarryPhoto(x.m));
    const chain: typeof texts = [];
    let next = ms(receivedAt);
    for (let i = texts.length - 1; i >= 0; i--) {
        if (next - ms(texts[i].receivedAt) > BURST_MS) break;
        chain.unshift(texts[i]);
        next = ms(texts[i].receivedAt);
    }
    const chainTimes = new Set([...chain.map(x => x.receivedAt), receivedAt]);
    const allTexts = [...texts, { m: text, receivedAt }];
    const photos = mine
        .filter(({ m, receivedAt: at }) => {
            if (!isBarePhoto(m)) return false;
            const first = allTexts.find(t => ms(t.receivedAt) > ms(at));
            return !!first && ms(first.receivedAt) - ms(at) <= PAIR_WINDOW_MS && chainTimes.has(first.receivedAt);
        })
        .map(p => p.m)
        .slice(-MAX_PAIRED_PHOTOS);
    return { texts: chain.map(x => x.m), photos };
}
