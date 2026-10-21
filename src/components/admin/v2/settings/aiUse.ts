// AI use this calendar month (gap 19). Ghana is on UTC all year, so the
// shop's month is the UTC month. Pure, for the unit test.
import { USD_TO_GHS } from "@/lib/ai/pricing";

export function monthRangeUtc(now: Date): { from: string; to: string; label: string } {
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    return {
        from: from.toISOString(),
        to: to.toISOString(),
        label: from.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }),
    };
}

/** GH₵ to 2 dp. `markupPct` only for the admin view; null leaves it out. */
export function monthUse(costUsd: number, turns: number, markupPct: number | null): { turns: number; ghs: number; withMarkupGhs: number | null } {
    const r2 = (x: number) => Math.round(x * 100) / 100;
    const ghs = r2((Number.isFinite(costUsd) ? costUsd : 0) * USD_TO_GHS);
    const withMarkupGhs = markupPct == null || !Number.isFinite(markupPct) ? null : r2(ghs * (1 + Math.max(0, markupPct) / 100));
    return { turns: Math.max(0, Math.trunc(turns) || 0), ghs, withMarkupGhs };
}
