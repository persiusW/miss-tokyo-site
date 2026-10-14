import fs from "fs";
import path from "path";
import { test, expect } from "@playwright/test";
import { cleanName, cleanText, epochToIso, MAX_NAME, MAX_TEXT, parseChatbotsAfrica } from "../../../src/lib/whatsapp/parsers/chatbotsAfrica";

// Fixtures use fake numbers (2332000000xx) and ids only. Never commit real ones.
const DIR = path.join(__dirname, "../../fixtures/whatsapp/chatbots-africa");
const raw = (name: string) => fs.readFileSync(path.join(DIR, name), "utf8");
const parse = (name: string) => parseChatbotsAfrica(raw(name));

test("the real text shape: sender, user id, name, text, time, our phone number id", () => {
    const p = parse("text-basic.json");
    expect(p.messages).toEqual([{
        messageId: "wamid.TEST0001", from: "233200000001", name: "Test Customer", type: "text", text: "Hi",
        fromUserId: "GH.0000000000000001", at: "2026-10-14T17:30:00.000Z", mediaId: null, mimeType: null,
    }]);
    expect(p.phoneNumberIds).toEqual(["1000000000000001"]);
    expect(p.externalId).toBe("wamid.TEST0001");
    expect(p.statuses).toEqual([]);
});

test("the real image shape: media id and type kept, the lookaside url never", () => {
    const p = parse("image-real-shape.json");
    expect(p.messages[0]).toMatchObject({ type: "image", mediaId: "2000000000000001", mimeType: "image/jpeg", text: null });
    expect(JSON.stringify(p)).not.toContain("lookaside");
});

test("every message, change and entry is read, never only [0]", () => {
    expect(parse("text-multi-message.json").messages.map(m => m.text)).toEqual(["First", "Second"]);
    const p = parse("multi-entry-change.json");
    expect(p.messages.map(m => [m.messageId, m.from, m.name])).toEqual([
        ["wamid.TEST0005", "233200000001", "Test Customer"],
        ["wamid.TEST0006", "233200000002", "Second Customer"],
        ["wamid.TEST0007", "233200000003", "Third Customer"],
    ]);
    expect(p.notes).toEqual(["ignored field account_update"]);
});

test("a repeated wamid inside one delivery is returned twice for the pipeline to dedupe", () => {
    expect(parse("duplicate-wamid.json").messages.map(m => m.messageId)).toEqual(["wamid.TEST0008", "wamid.TEST0008"]);
});

test("receipts are read as statuses, with no messages and a stable key", () => {
    const d = parse("status-delivered.json");
    expect(d.messages).toEqual([]);
    expect(d.statuses).toEqual([{ messageId: "wamid.OUT0001", status: "delivered", at: "2026-10-14T17:31:40.000Z", recipient: "233200000001" }]);
    expect(d.externalId).toBe("wamid.OUT0001:delivered");
    expect(parse("status-read.json").externalId).toBe("wamid.OUT0001:read");
    const both = parse("status-and-message.json");
    expect([both.messages.length, both.statuses!.length, both.externalId]).toEqual([1, 1, "wamid.TEST0009"]);
});

test("unsupported types never crash: type, caption and media kept", () => {
    const p = parse("unsupported-types.json");
    expect(p.messages.map(m => m.type)).toEqual(["image", "audio", "document", "location", "interactive", "button", "sticker", "reaction"]);
    expect(p.messages[0]).toMatchObject({ text: "Do you have this?", mediaId: "2000000000000002", mimeType: "image/png" });
    expect(p.messages[3]).toMatchObject({ mediaId: null, text: null });
    expect(p.messages.every(m => m.from === "233200000001")).toBe(true);
});

test("hostile names and text are cleaned and capped", () => {
    const m = parse("hostile-input.json").messages[0];
    expect(m.name!.length).toBeLessThanOrEqual(MAX_NAME);
    expect(m.name).not.toMatch(/[\u0000-\u001f​‮]/);
    expect(m.text!.length).toBe(MAX_TEXT);
    expect(m.text).not.toMatch(/[\u0007​‮]/);
    expect(m.text!.startsWith("Hello there\n\nsecond line")).toBe(true);
    expect(cleanName("  Ama  \n Mensah 💃🏾 ")).toBe("Ama Mensah 💃🏾");
    expect(cleanText("\u0000")).toBe(null);
});

test("timestamps: seconds and milliseconds read; missing or junk is unknown", () => {
    expect(parse("timestamps.json").messages.map(m => m.at)).toEqual([null, null, "2026-10-14T17:30:00.000Z", "2100-01-01T00:00:00.000Z"]);
    expect(epochToIso("1791999000")).toBe("2026-10-14T17:30:00.000Z");
    expect(epochToIso("-5")).toBe(null);
});

test("numbers become 233… with no plus, and names follow the number", () => {
    const p = parse("numbers.json");
    expect(p.messages.map(m => [m.from, m.name])).toEqual([
        ["233200000001", "Test Customer"], ["233200000002", "Test Customer"], ["447700900000", null],
    ]);
});

test("a hidden number leaves from empty but keeps the user id and name", () => {
    expect(parse("username-only.json").messages[0]).toMatchObject({ from: "", fromUserId: "GH.0000000000000004", name: "Hidden Number" });
});

test("the phone number id is reported for the soft check, not judged here", () => {
    expect(parse("id-mismatch.json").phoneNumberIds).toEqual(["1999999999999999"]);
});

test("a body that is not JSON throws, so it is retried and then given up visibly", () => {
    expect(() => parse("not-json-php.txt")).toThrow("body is not JSON");
    expect(() => parse("not-json-form.txt")).toThrow("body is not JSON");
    expect(() => parseChatbotsAfrica("[]")).toThrow("body is not a JSON object");
});

test("odd shapes are noted, never thrown", () => {
    expect(parse("odd-empty.json")).toMatchObject({ messages: [], notes: ["ignored: object is missing"] });
    expect(parse("odd-object.json").notes).toEqual(["ignored: object is page"]);
    expect(parse("odd-no-changes.json")).toMatchObject({ messages: [], notes: ["entry without changes"] });
});
