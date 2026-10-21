import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { parseChatbotsAfrica } from "../../../src/lib/whatsapp/parsers/chatbotsAfrica";
import type { InboundMessage, ParsedInbound } from "../../../src/lib/whatsapp/pipeline";
import { BURST_MS, carriedBefore, MAX_PAIRED_PHOTOS, PAIR_SETTLE_MS, PAIR_WINDOW_MS, photosBefore, textFollows, textFollowsSoon, type PairingDeps } from "../../../src/lib/whatsapp/photoPairing";

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

// ── Bursts of texts ──────────────────────────────────────────────────────────
const t = (s: string, id: string) => text(s, { messageId: `wamid.${id}` });

test("a quick burst is one question: the earlier texts stand down, the last carries them in order", async () => {
    const T0 = PHOTO_AT;
    const events = [
        { at: T0, m: t("Hi", "1") },
        { at: plus(T0, 1500), m: t("I want the brown dress", "2") },
        { at: plus(T0, 3500), m: t("size M", "3") },
    ];
    const w = world(events, plus(T0, 60_000));
    expect(await textFollowsSoon(events[0].m, events[0].at, w.deps)).toBe(true);
    expect(await textFollowsSoon(events[1].m, events[1].at, w.deps)).toBe(true);
    expect(await textFollowsSoon(events[2].m, events[2].at, w.deps)).toBe(false);
    const c = await carriedBefore(events[2].m, events[2].at, w.deps);
    expect(c.texts.map(m => m.text)).toEqual(["Hi", "I want the brown dress"]);
    expect(c.photos).toEqual([]);
});

test("a pause longer than the burst window starts a new question; STOP never joins one", async () => {
    const a = { at: PHOTO_AT, m: t("Hi", "1") };
    const b = { at: plus(PHOTO_AT, BURST_MS + 1), m: t("Do you deliver to Kumasi?", "2") };
    const w = world([a, b], plus(PHOTO_AT, 60_000));
    expect(await textFollowsSoon(a.m, a.at, w.deps)).toBe(false);
    expect((await carriedBefore(b.m, b.at, w.deps)).texts).toEqual([]);
    const stop = { at: plus(PHOTO_AT, 1000), m: t("STOP", "s") };
    const w2 = world([a, stop], plus(PHOTO_AT, 60_000));
    expect(await textFollowsSoon(a.m, a.at, w2.deps)).toBe(false);
});

test("a photo then a burst: the photo rides with the whole burst, even past 12 s from the last text", async () => {
    const p = { at: PHOTO_AT, m: photo() };
    const a = { at: plus(PHOTO_AT, 11_000), m: t("Do you have this", "a") };
    const b = { at: plus(PHOTO_AT, 13_000), m: t("in M?", "b") };
    const w = world([p, a, b], plus(PHOTO_AT, 60_000));
    expect(await textFollows(p.m, p.at, w.deps)).toBe(true);           // the photo stands down
    expect(await textFollowsSoon(a.m, a.at, w.deps)).toBe(true);       // so does the first text
    const c = await carriedBefore(b.m, b.at, w.deps);
    expect(c.texts.map(m => m.text)).toEqual(["Do you have this"]);
    expect(c.photos.map(m => m.mediaId)).toEqual(["2000000000000001"]);
});

test("one photo, two separate questions after it: only the first question's burst carries the photo", async () => {
    const p = { at: PHOTO_AT, m: photo() };
    const a = { at: plus(PHOTO_AT, 2000), m: t("Do you have this?", "a") };
    const b = { at: plus(PHOTO_AT, 8000), m: t("Also, delivery to Tema?", "b") };
    const w = world([p, a, b], plus(PHOTO_AT, 60_000));
    expect((await carriedBefore(a.m, a.at, w.deps)).photos.map(m => m.mediaId)).toEqual(["2000000000000001"]);
    expect((await carriedBefore(b.m, b.at, w.deps)).photos).toEqual([]);
});
