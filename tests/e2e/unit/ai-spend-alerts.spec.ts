import { test, expect } from "@playwright/test";
import { USD_TO_GHS } from "../../../src/lib/ai/pricing";
import { spendAlertText, spendLevel } from "../../../src/lib/ai/spendAlertRules";

const usd = (ghs: number) => ghs / USD_TO_GHS;

test("alert levels: 80 % and 100 % of the daily cap; none with the cap off", () => {
    expect(spendLevel(usd(39.9), 50)).toBe(0);
    expect(spendLevel(usd(40), 50)).toBe(80);
    expect(spendLevel(usd(49.99), 50)).toBe(80);
    expect(spendLevel(usd(50), 50)).toBe(100);
    expect(spendLevel(usd(80), 50)).toBe(100);
    expect(spendLevel(usd(10), 0)).toBe(0);
    expect(spendLevel(NaN, 50)).toBe(0);
});

test("the texts say what happens, in cedis, with no jargon", () => {
    expect(spendAlertText(80, usd(40), 50)).toBe("Miss Tokyo AI: today's AI spend has reached 80% of the daily cap (GH₵ 40.00 of GH₵ 50.00).");
    const full = spendAlertText(100, usd(50), 50);
    expect(full).toContain("GH₵ 50.00 of GH₵ 50.00");
    expect(full).toContain("paused until midnight");
    expect(full.length).toBeLessThanOrEqual(320);
});
