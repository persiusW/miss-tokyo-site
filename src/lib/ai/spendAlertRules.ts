// When and what to text about today's AI spend (spendAlerts.ts sends it). Pure.
import { USD_TO_GHS } from "@/lib/ai/pricing";

export type SpendLevel = 0 | 80 | 100;

/** The highest alert level today's spend has reached; 0 when under 80 % or the cap is off. */
export function spendLevel(spentUsd: number, capGhs: number): SpendLevel {
    if (!(capGhs > 0) || !Number.isFinite(spentUsd)) return 0;
    const pct = (spentUsd * USD_TO_GHS) / capGhs * 100;
    return pct >= 100 ? 100 : pct >= 80 ? 80 : 0;
}

export function spendAlertText(level: Exclude<SpendLevel, 0>, spentUsd: number, capGhs: number): string {
    const spent = `GH₵ ${(spentUsd * USD_TO_GHS).toFixed(2)} of GH₵ ${capGhs.toFixed(2)}`;
    return level === 100
        ? `Miss Tokyo AI: today's AI budget is used up (${spent}). The shop assistant and WhatsApp replies are paused until midnight. Raise the cap in Settings > AI to resume.`
        : `Miss Tokyo AI: today's AI spend has reached 80% of the daily cap (${spent}).`;
}
