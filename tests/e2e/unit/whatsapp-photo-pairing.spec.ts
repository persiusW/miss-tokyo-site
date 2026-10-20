import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { parseChatbotsAfrica } from "../../../src/lib/whatsapp/parsers/chatbotsAfrica";
import type { InboundMessage, ParsedInbound } from "../../../src/lib/whatsapp/pipeline";
import { MAX_PAIRED_PHOTOS, PAIR_SETTLE_MS, PAIR_WINDOW_MS, photosBefore, textFollows, type PairingDeps } from "../../../src/lib/whatsapp/photoPairing";

// The 2026-10-20 chat: a screenshot with no caption, then "Do you have this ?" four seconds later.
const PHONE = "233200000041";
const PHOTO_AT = "2026-10-20T22:39:48.994Z";
const TEXT_AT = "2026-10-20T22:39:50.884Z";
const plus = (iso: string, ms: number) => new Date(new Date(iso).getTime() + ms).toISOString();

const msg = (over: Partial<InboundMessage>): InboundMessage => ({ messageId: "wamid.X", from: PHONE, name: null, type: "text", text: null, ...over });
const photo = (mediaId = "2000000000000001", over: Partial<InboundMessage> = {}) => msg({ type: "image", mediaId, messageId: `wamid.P${mediaId}`, ...over });
const text = (t = "Do you have this ?", over: Partial<InboundMessage> = {}) => msg({ text: t, messageId: "wamid.T", ...over });

// Events are stored as their parsed form; the fake parser reads them back.
function world(events: { at: string; m: InboundMessage }[], now = plus(PHOTO_AT, 3000)) {
    const slept: number[] = [];
    const deps: PairingDeps = {
        eventsBetween: async (from, to) => events
            .filter(e => e.at > from && e.at < to)
            .map(e => ({ receivedAt: e.at, rawBody: JSON.stringify({ externalId: null, messages: [e.m] } satisfies ParsedInbound) })),
        parse: raw => JSON.parse(raw),
        now: () => new Date(now),
        sleep: async ms => { slept.push(ms); },
    };
    return { deps, slept };
}

test("the incident: the photo stands down after the window, and the text carries it", async () => {
    const events = [{ at: PHOTO_AT, m: photo() }, { at: TEXT_AT, m: text() }];
    const w = world(events);
    expect(await textFollows(photo(), PHOTO_AT, w.deps)).toBe(true);
    expect(w.slept).toEqual([PAIR_WINDOW_MS + PAIR_SETTLE_MS - 3000]);
    expect((await photosBefore(text(), TEXT_AT, w.deps)).map(p => p.mediaId)).toEqual(["2000000000000001"]);
});

test("both sides agree at the window's edge: exactly one turn answers each photo", async () => {
    for (const gap of [PAIR_WINDOW_MS - 1, PAIR_WINDOW_MS, PAIR_WINDOW_MS + 1, PAIR_WINDOW_MS + 5000]) {
        const at = plus(PHOTO_AT, gap);
        const w = world([{ at: PHOTO_AT, m: photo() }, { at, m: text() }]);
        const photoStandsDown = await textFollows(photo(), PHOTO_AT, w.deps);
        const textCarries = (await photosBefore(text(), at, w.deps)).length === 1;
        expect(photoStandsDown, `gap ${gap}`).toBe(textCarries);
        expect(textCarries, `gap ${gap}`).toBe(gap <= PAIR_WINDOW_MS);
    }
});

test("no pairing: another sender, STOP, a tap, a captioned photo, or a text that came first", async () => {
    const other = world([{ at: PHOTO_AT, m: photo() }, { at: TEXT_AT, m: text("Do you have this ?", { from: "233200000042" }) }]);
    expect(await textFollows(photo(), PHOTO_AT, other.deps)).toBe(false);

    const stop = world([{ at: PHOTO_AT, m: photo() }, { at: TEXT_AT, m: text("STOP") }]);
    expect(await textFollows(photo(), PHOTO_AT, stop.deps)).toBe(false);
    expect(await photosBefore(text("STOP"), TEXT_AT, stop.deps)).toEqual([]);

    const tap = world([{ at: PHOTO_AT, m: photo() }, { at: TEXT_AT, m: msg({ type: "interactive", tap: { id: null, title: "Yes" } }) }]);
    expect(await textFollows(photo(), PHOTO_AT, tap.deps)).toBe(false);

    const captioned = photo("2000000000000001", { text: "Do you have this?" });
    const cap = world([{ at: PHOTO_AT, m: captioned }, { at: TEXT_AT, m: text() }]);
    expect(await textFollows(captioned, PHOTO_AT, cap.deps)).toBe(false);
    expect(await photosBefore(text(), TEXT_AT, cap.deps)).toEqual([]);

    const textFirst = world([{ at: PHOTO_AT, m: text() }, { at: TEXT_AT, m: photo() }]);
    expect(await textFollows(photo(), TEXT_AT, textFirst.deps)).toBe(false);
    expect(await photosBefore(text(), PHOTO_AT, textFirst.deps)).toEqual([]);
});

test("several photos then one question: all carried, oldest first, replays once, at most the latest four", async () => {
    const ids = ["2000000000000001", "2000000000000002", "2000000000000003", "2000000000000004", "2000000000000005"];
    const events = ids.map((id, i) => ({ at: plus(PHOTO_AT, i * 500), m: photo(id) }));
    events.push({ at: plus(PHOTO_AT, 600), m: photo(ids[1]) });   // the provider sent one twice
    const at = plus(PHOTO_AT, 4000);
    events.push({ at, m: text("Do you have these?") });
    const w = world(events);
    const got = (await photosBefore(text("Do you have these?"), at, w.deps)).map(p => p.mediaId);
    expect(got).toEqual(ids.slice(-MAX_PAIRED_PHOTOS));
    for (const e of events.filter(e => e.m.type === "image")) expect(await textFollows(e.m, e.at, w.deps)).toBe(true);
});

test("a photo the sweep picks up late does not wait again", async () => {
    const w = world([{ at: PHOTO_AT, m: photo() }], plus(PHOTO_AT, 10 * 60_000));
    expect(await textFollows(photo(), PHOTO_AT, w.deps)).toBe(false);
    expect(w.slept).toEqual([]);
});

test("real provider payloads: the parser's bare photo pairs with its text, and the store's sender filter matches", async () => {
    // Production bodies are compact JSON (checked against stored events); the fixtures are pretty-printed.
    const dir = path.join(__dirname, "../../fixtures/whatsapp/chatbots-africa");
    const compact = (name: string) => JSON.stringify(JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")));
    const photoBody = compact("image-real-shape.json");
    const textBody = compact("text-basic.json");
    const [p] = parseChatbotsAfrica(photoBody).messages;
    const [t] = parseChatbotsAfrica(textBody).messages;
    expect([p.type, !!p.mediaId, p.text ?? null, t.type]).toEqual(["image", true, null, "text"]);
    for (const body of [photoBody, textBody]) expect(body).toContain(`"from":"${p.from}"`);

    const events = [{ receivedAt: PHOTO_AT, rawBody: photoBody }, { receivedAt: TEXT_AT, rawBody: textBody }];
    const deps: PairingDeps = {
        eventsBetween: async (from, to) => events.filter(e => e.receivedAt > from && e.receivedAt < to),
        parse: raw => parseChatbotsAfrica(raw), now: () => new Date(plus(PHOTO_AT, 20_000)),
    };
    expect(await textFollows(p, PHOTO_AT, deps)).toBe(true);
    expect((await photosBefore(t, TEXT_AT, deps)).map(m => m.mediaId)).toEqual([p.mediaId]);
});
