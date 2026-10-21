// Statement periods for the features bill. Ghana keeps UTC all year (no
// daylight saving), so Accra midnight is UTC midnight and dates here are
// plain UTC calendar dates.
//
// The cut-off day is 1 to 28 (owner: "1st to 28th"; confirmed 2026-10-21:
// default 28). A statement runs from the day after the previous cut-off
// through the cut-off day: with 28, 29 September to 28 October. Every month
// has a 28th, so no period ever skips a month.

/** "2026-10-28" for a Date, in Accra (= UTC). */
export function isoDay(d: Date): string {
    return d.toISOString().slice(0, 10);
}

function day(y: number, m: number, d: number): Date {
    return new Date(Date.UTC(y, m, d));
}

export type Period = {
    /** First day, inclusive (YYYY-MM-DD). */
    start: string;
    /** Cut-off day, inclusive. */
    end: string;
    /** Instants for queries: [fromIso, toIso). */
    fromIso: string;
    toIso: string;
};

export function clampCutoff(n: unknown): number {
    const v = Math.trunc(Number(n));
    return Number.isFinite(v) && v >= 1 && v <= 28 ? v : 28;
}

function make(start: Date, end: Date): Period {
    const after = new Date(end.getTime() + 86_400_000);
    return { start: isoDay(start), end: isoDay(end), fromIso: start.toISOString(), toIso: after.toISOString() };
}

/** The period a moment falls in. `billingStart` (YYYY-MM-DD) trims the first one. */
export function periodFor(now: Date, cutoffDay: number, billingStart?: string): Period {
    const c = clampCutoff(cutoffDay);
    const y = now.getUTCFullYear(), m = now.getUTCMonth(), d = now.getUTCDate();
    const end = d <= c ? day(y, m, c) : day(y, m + 1, c);
    const start = new Date(day(end.getUTCFullYear(), end.getUTCMonth() - 1, c).getTime() + 86_400_000);
    const first = billingStart ? new Date(`${billingStart}T00:00:00Z`) : null;
    return make(first && first > start && first <= end ? first : start, end);
}

/** The period just before this one. */
export function previousPeriod(p: Period, cutoffDay: number, billingStart?: string): Period {
    // From the untrimmed start, so a period trimmed by billingStart still steps back a whole month.
    const full = periodFor(new Date(`${p.end}T00:00:00Z`), cutoffDay);
    return periodFor(new Date(new Date(`${full.start}T00:00:00Z`).getTime() - 86_400_000), cutoffDay, billingStart);
}

/** Every finished period since billing started, oldest first (the one running now is left out). */
export function closedPeriods(now: Date, cutoffDay: number, billingStart: string): Period[] {
    const out: Period[] = [];
    const startDay = new Date(`${billingStart}T00:00:00Z`);
    let p = previousPeriod(periodFor(now, cutoffDay, billingStart), cutoffDay, billingStart);
    while (new Date(`${p.end}T00:00:00Z`) >= startDay && out.length < 120) {
        out.unshift(p);
        p = previousPeriod(p, cutoffDay, billingStart);
    }
    return out;
}

/** Days in the period, and how many have started by `now` (at least 1). */
export function periodProgress(p: Period, now: Date): { days: number; elapsed: number } {
    const from = new Date(p.fromIso).getTime(), to = new Date(p.toIso).getTime();
    const days = Math.round((to - from) / 86_400_000);
    const elapsed = Math.min(days, Math.max(1, Math.ceil((now.getTime() - from) / 86_400_000)));
    return { days, elapsed };
}

/** "29 Sep – 28 Oct 2026". */
export function periodLabel(p: { start: string; end: string }): string {
    const f = (s: string, withYear: boolean) => new Date(`${s}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}), timeZone: "UTC" });
    return `${f(p.start, p.start.slice(0, 4) !== p.end.slice(0, 4))} to ${f(p.end, true)}`;
}
