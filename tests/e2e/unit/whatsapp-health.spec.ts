import { test, expect } from "@playwright/test";
import { inboundHealth, STUCK_AFTER_MS, type InboundCounts } from "../../../src/lib/whatsapp/health";

const NOW = new Date("2026-10-14T12:00:00Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
const base: InboundCounts = { mode: "processing", parserReady: true, switchOn: true, lastReceivedAt: ago(60_000), waiting: 0, oldestWaitingAt: null, retrying: 0, gaveUp7d: 0, oversized7d: 0, refused7d: 0, noPhone7d: 0 };

test("store-only mode says so and why, and waiting messages are not an alarm there", () => {
    const h = inboundHealth({ ...base, mode: "capture", parserReady: false, waiting: 12, oldestWaitingAt: ago(3 * 3600_000) }, NOW);
    expect(h.level).toBe("ok");
    expect(h.summary).toMatch(/Storing only/);
    expect(h.summary).toMatch(/reader is not set up/);
    expect(inboundHealth({ ...base, mode: "capture", switchOn: false }, NOW).summary).toMatch(/switch is off/);
});

test("a message waiting over 15 minutes while processing is a problem", () => {
    const h = inboundHealth({ ...base, waiting: 3, oldestWaitingAt: ago(STUCK_AFTER_MS + 60_000) }, NOW);
    expect(h.level).toBe("problem");
    expect(h.summary).toBe("3 messages are waiting to be answered. The oldest has waited over 15 minutes.");
    expect(inboundHealth({ ...base, waiting: 1, oldestWaitingAt: ago(60_000) }, NOW).level).toBe("ok");
});

test("retries, give-ups and oversized deliveries are warnings with plain notes", () => {
    expect(inboundHealth({ ...base, retrying: 1, waiting: 1, oldestWaitingAt: ago(60_000) }, NOW))
        .toMatchObject({ level: "warning", summary: "1 message is being retried." });
    const h = inboundHealth({ ...base, gaveUp7d: 2, oversized7d: 1 }, NOW);
    expect(h.level).toBe("warning");
    expect(h.notes).toEqual([
        "1 delivery was too large to store this week. Check WhatsApp for it.",
        "2 messages could not be handled this week and went to the team.",
    ]);
    // Lost content shows even in store-only mode.
    expect(inboundHealth({ ...base, mode: "capture", parserReady: false, oversized7d: 1 }, NOW).level).toBe("warning");
});

test("all quiet while processing is ok", () => {
    expect(inboundHealth(base, NOW)).toEqual({ level: "ok", summary: "Working: messages are being answered.", notes: [] });
});

test("refused deliveries and hidden numbers are shown to staff in plain words", () => {
    const h = inboundHealth({ ...base, refused7d: 2, noPhone7d: 1 }, NOW);
    expect(h.level).toBe("warning");
    expect(h.notes).toEqual([
        "Deliveries were refused for arriving too fast this week (2 times). Those messages were not resent: check WhatsApp.",
        "1 message came from a hidden number this week. Reply to it in WhatsApp.",
    ]);
    expect(inboundHealth({ ...base, mode: "capture", switchOn: false, refused7d: 1 }, NOW).level).toBe("warning");
});
