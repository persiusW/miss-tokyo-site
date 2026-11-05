import { test, expect } from "@playwright/test";
import { DEFAULT_PERIOD, parsePeriod, periodPhrase, periodRange } from "../../../src/lib/admin/v2/inboxPeriod";
import { readAllPages, summariseStats } from "../../../src/lib/whatsapp/inboxStats";

// 2026-11-05 18:00 in Accra (UTC+0, no daylight saving).
const NOW = new Date("2026-11-05T18:00:00Z");
const iso = (d: Date | null) => d?.toISOString() ?? null;

test("the default is this month, from the 1st to now", () => {
    expect(DEFAULT_PERIOD).toBe("month");
    const q = parsePeriod(null, null, null);
    expect(q.period).toBe("month");
    const r = periodRange(q, NOW);
    expect(iso(r.from)).toBe("2026-11-01T00:00:00.000Z");
    expect(iso(r.to)).toBe(NOW.toISOString());
});

test("30, 60 and 90 days count today as the last day", () => {
    expect(iso(periodRange(parsePeriod("30d", null, null), NOW).from)).toBe("2026-10-07T00:00:00.000Z");
    expect(iso(periodRange(parsePeriod("60d", null, null), NOW).from)).toBe("2026-09-07T00:00:00.000Z");
    expect(iso(periodRange(parsePeriod("90d", null, null), NOW).from)).toBe("2026-08-08T00:00:00.000Z");
});

test("all time has no start", () => {
    expect(periodRange(parsePeriod("all", null, null), NOW).from).toBeNull();
});

test("a custom period covers both whole days", () => {
    const r = periodRange(parsePeriod("custom", "2026-10-14", "2026-10-20"), NOW);
    expect(iso(r.from)).toBe("2026-10-14T00:00:00.000Z");
    expect(iso(r.to)).toBe("2026-10-21T00:00:00.000Z");
});

test("a custom period ending today stops at now", () => {
    expect(iso(periodRange(parsePeriod("custom", "2026-11-01", "2026-11-05"), NOW).to)).toBe(NOW.toISOString());
});

test("anything unusable falls back to this month", () => {
    for (const [p, a, b] of [
        ["nonsense", null, null], ["custom", null, null], ["custom", "2026-10-14", null],
        ["custom", "2026-10-20", "2026-10-14"], ["custom", "2026-02-31", "2026-03-01"], ["custom", "14/10/2026", "2026-10-20"],
    ] as const) expect(parsePeriod(p, a, b).period).toBe("month");
});

test("each period reads plainly", () => {
    expect(periodPhrase(parsePeriod("month", null, null), NOW)).toBe("this month");
    expect(periodPhrase(parsePeriod("all", null, null), NOW)).toBe("all time");
    expect(periodPhrase(parsePeriod("60d", null, null), NOW)).toBe("last 60 days");
    expect(periodPhrase(parsePeriod("custom", "2026-10-14", "2026-10-20"), NOW)).toBe("14–20 Oct 2026");
});

test("reading stops only on a short page, so more than 1000 rows all arrive", async () => {
    const rows = Array.from({ length: 2345 }, (_, i) => i);
    const asked: number[] = [];
    const got = await readAllPages(async (from, to) => { asked.push(from); return { data: rows.slice(from, to + 1), error: null }; });
    expect(got).toHaveLength(2345);
    expect(asked).toEqual([0, 1000, 2000]);
});

test("a failed page is an error, never a smaller figure", async () => {
    await expect(readAllPages(async () => ({ data: null, error: new Error("db") }))).rejects.toThrow("db");
});

test("a customer who wrote five times is one chat, and sales add up to the pesewa", () => {
    expect(summariseStats(
        [{ conversation_id: "a" }, { conversation_id: "a" }, { conversation_id: "b" }],
        [{ total_amount: "10.10" }, { total_amount: 20.2 }],
        [{ conversation_id: "a" }, { conversation_id: "a" }],
    )).toEqual({ chats: 2, assistantOrders: 2, assistantSalesGhs: 30.3, handedOver: 1 });
});
