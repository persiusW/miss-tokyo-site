// The guided cutover from the hand-made Paystack split to the dashboard's
// per-payment split (owner decision 2026-10-21). Pure: the Payouts tab, its
// actions and the tests all read the same stages.
//
//   1. Use the dashboard for payouts   payout_split_live ON
//   2. Check the first payment         Paystack's split shares for the first
//                                      payment after step 1 must match what
//                                      the dashboard planned, to the pesewa
//   3. Turn off the old Paystack split PUT /split/:id {active:false}, only
//                                      after step 2 is green; reversible
//   Back: Go back to the Paystack split payout_split_live OFF; the env split
//         path resumes exactly as before (unless the old split was retired).

export type SplitShares = { paystackP: number | null; mainP: number | null; subP: number | null };

export type CutoverCheck = {
    reference: string;
    ok: boolean;
    checkedAt: string;
    expected: { subP: number; mainP: number };
    actual: SplitShares;
    customerPaidFee: boolean;
};

export type Cutover = {
    liveAt?: string | null;
    check?: CutoverCheck | null;
    /** Splits turned off from the dashboard: code → when. */
    retired?: Record<string, string>;
};

export function parseCutover(raw: unknown): Cutover {
    const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;
    const retired = r.retired && typeof r.retired === "object" ? Object.fromEntries(Object.entries(r.retired).filter(([k, v]) => /^SPL_[A-Za-z0-9]+$/.test(k) && typeof v === "string")) as Record<string, string> : {};
    const c = r.check && typeof r.check === "object" && typeof r.check.reference === "string" ? r.check as CutoverCheck : null;
    return { liveAt: typeof r.live_at === "string" ? r.live_at : typeof r.liveAt === "string" ? r.liveAt : null, check: c, retired };
}

/** The jsonb written back (snake_case top level, like the migration documents). */
export function cutoverJson(c: Cutover): Record<string, unknown> {
    return { live_at: c.liveAt ?? null, check: c.check ?? null, retired: c.retired ?? {} };
}

export type Stage = "no_account" | "ready" | "awaiting_payment" | "check_failed" | "checked" | "retired";

export function cutoverStage(a: { live: boolean; hasAccount: boolean; cutover: Cutover; envSplitCode: string | null }): Stage {
    if (!a.hasAccount) return "no_account";
    if (!a.live) return "ready";
    if (a.envSplitCode && a.cutover.retired?.[a.envSplitCode]) return "retired";
    const ch = a.cutover.check;
    if (!ch || (a.cutover.liveAt && ch.checkedAt < a.cutover.liveAt)) return "awaiting_payment";
    return ch.ok ? "checked" : "check_failed";
}

/** Turning a split off is only offered once the dashboard's split is proven on a real payment. */
export function canRetireSplits(stage: Stage): boolean {
    return stage === "checked" || stage === "retired";
}

/**
 * Does Paystack's split of a real payment match the plan, to the pesewa?
 * The subaccount must get exactly the planned share. The main account gets
 * the rest of what the shop asked for when the customer paid Paystack's fee
 * on top (charged > requested), or the rest less Paystack's fee when the
 * shop bore it.
 */
export function splitMatches(a: { requestedP: number; chargedP: number | null; plannedTakeP: number; shares: SplitShares }): { ok: boolean; expected: { subP: number; mainP: number }; customerPaidFee: boolean } {
    const customerPaidFee = a.chargedP != null && a.chargedP > a.requestedP;
    const fee = a.shares.paystackP ?? 0;
    const mainP = a.requestedP - a.plannedTakeP - (customerPaidFee ? 0 : fee);
    const expected = { subP: a.plannedTakeP, mainP };
    const ok = a.plannedTakeP > 0 && a.shares.subP === expected.subP && a.shares.mainP === expected.mainP;
    return { ok, expected, customerPaidFee };
}

/** Paystack's per-party figures from a transaction: fees_split (subaccount + transaction_charge) or split.shares. */
export function sharesOf(tx: Record<string, unknown>, subaccountCode: string): SplitShares {
    const j = (v: unknown) => { if (typeof v !== "string") return v; try { return JSON.parse(v); } catch { return null; } };
    const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null);
    const fs = j(tx.fees_split) as Record<string, unknown> | null;
    if (fs && typeof fs === "object") return { paystackP: n(fs.paystack), mainP: n(fs.integration), subP: n(fs.subaccount) };
    const sp = j(tx.split) as Record<string, any> | null;
    const sh = sp && typeof sp === "object" ? j(sp.shares) as Record<string, any> | null : null;
    if (sh && typeof sh === "object") {
        const subs = Array.isArray(sh.subaccounts) ? sh.subaccounts : [];
        const mine = subs.filter((e: any) => e?.subaccount_code === subaccountCode).reduce((t: number, e: any) => t + (n(e.amount) ?? 0), 0);
        return { paystackP: n(sh.paystack), mainP: n(sh.integration), subP: subs.length ? mine : null };
    }
    return { paystackP: n(tx.fees), mainP: null, subP: null };
}
