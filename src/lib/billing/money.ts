// Money helpers for billing and payouts. Every amount is worked in whole
// pesewas (integers) and only turned back into cedis at the edge, so no
// rounding drift builds up across a ledger or a statement.

/** GH₵ → pesewas, rounded half away from zero. Non-finite counts as 0. */
export function toP(ghs: number | string | null | undefined): number {
    const v = Number(ghs);
    if (!Number.isFinite(v)) return 0;
    return Math.sign(v) * Math.round(Math.abs(v) * 100 + 1e-9);
}

/** Pesewas → GH₵. */
export const fromP = (p: number): number => Math.round(p) / 100;

/** Round a cedi amount to the pesewa. */
export const r2 = (ghs: number): number => fromP(toP(ghs));

/** A finite number or null. Strings like "2.5" count. */
export function numOrNull(v: unknown): number | null {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}
