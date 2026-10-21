// The split fields every online payment carries when it starts: the
// storefront checkout (and the shop/WhatsApp assistants, which use it), POS
// pay links and invoice pay links. The AMOUNT is never touched here: only
// which Paystack split fields ride along, and metadata for the ledger.
//
// Switch off (payout_split_live, the default): exactly as before this
// existed: the env split code (PAYSTACK_SPLIT_CODE) where the old code sent
// it, or nothing. Switch on with an admin payout subaccount: a dynamic split
// (subaccount + transaction_charge + bearer "account") so the admin
// subaccount receives exactly the admin share planned for this payment, plus
// anything still owed. The env split is the fallback while no subaccount is
// stored. If Paystack refuses the split, the payment is retried once without
// it (same amount) and the ledger records the share as owed.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getBillingSettings, shareRuleOf, type BillingSettings } from "./settings";
import { planTake, shareDue, type SkipReason } from "./payoutRules";
import { numOrNull } from "./money";

export type PayoutSource = "checkout" | "pos" | "invoice";

/** How the env split code was gated on each path before this existed. */
const ENV_RULE: Record<PayoutSource, "min5" | "always"> = { checkout: "min5", pos: "min5", invoice: "always" };

/** Keys that may differ between switch off and on. Nothing else in a Paystack body may. */
export const SPLIT_KEYS = ["split_code", "subaccount", "transaction_charge", "bearer"] as const;

export type Payout = {
    /** Split fields to add to the Paystack body (top level). */
    fields: Record<string, unknown>;
    /** Added to the Paystack metadata for the ledger. */
    meta: Record<string, unknown>;
    /** True when the split is ours (dynamic) and Paystack may refuse it. */
    dynamic: boolean;
    /** The same payment without our split, for one retry if Paystack refuses it. */
    fallback: { fields: Record<string, unknown>; meta: Record<string, unknown> } | null;
};

export type PayoutArgs = {
    source: PayoutSource;
    /** GH₵ the shop asks Paystack for (goods + delivery + processing fee). */
    amountGhs: number;
    /** The processing fee inside that amount. */
    feeGhs: number;
    /** What the fee % was charged on. */
    baseGhs: number;
};

export type PayoutDeps = {
    settings?: () => Promise<BillingSettings>;
    owedGhs?: () => Promise<number>;
    envSplitCode?: string | null;
};

async function readOwed(): Promise<number> {
    const { data, error } = await (supabaseAdmin as any).rpc("fn_admin_payout_totals");
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return numOrNull(row?.owed_ghs) ?? 0;
}

/** Today's env-split behaviour, unchanged. */
export function envSplitFields(source: PayoutSource, amountGhs: number, code: string | null | undefined): Record<string, unknown> {
    if (!code) return {};
    if (ENV_RULE[source] === "min5" && !(amountGhs >= 5)) return {};
    return { split_code: code };
}

export async function payoutFor(a: PayoutArgs, deps: PayoutDeps = {}): Promise<Payout> {
    const envCode = deps.envSplitCode !== undefined ? deps.envSplitCode : process.env.PAYSTACK_SPLIT_CODE ?? null;
    const base = { platform_fee_base: a.feeGhs > 0 ? a.baseGhs : undefined };
    const env = (meta: Record<string, unknown>): Payout => ({ fields: envSplitFields(a.source, a.amountGhs, envCode), meta: { ...base, ...meta }, dynamic: false, fallback: null });

    let s: BillingSettings;
    try { s = await (deps.settings ?? getBillingSettings)(); } catch { return env({}); }
    if (!s.payoutSplitLive) return env({});

    const due = shareDue(shareRuleOf(s), { totalGhs: a.amountGhs, feeGhs: a.feeGhs, baseGhs: a.baseGhs });
    const note = (r: SkipReason | "requested", take: number) => ({ admin_payout: { r, due, take } });
    if (!s.adminSubaccountCode) return env(note("no_account", 0));

    let owed = 0;
    try { owed = await (deps.owedGhs ?? readOwed)(); } catch (e) {
        // Without the balance, carry nothing: this payment's own share still goes.
        console.error("[payout] could not read the ledger balance", (e as Error)?.message ?? e);
    }
    const plan = planTake({
        live: true, subaccount: s.adminSubaccountCode, amountGhs: a.amountGhs, dueGhs: due, owedGhs: owed,
        minGhs: s.payoutMinGhs, paystackPct: s.paystackFeePct,
    });
    if (plan.reason || plan.transactionChargeP == null) {
        return { fields: {}, meta: { ...base, ...note(plan.reason ?? "small", 0) }, dynamic: false, fallback: null };
    }
    return {
        fields: { subaccount: s.adminSubaccountCode, transaction_charge: plan.transactionChargeP, bearer: "account" },
        meta: { ...base, ...note("requested", plan.takeGhs) },
        dynamic: true,
        fallback: { fields: {}, meta: { ...base, ...note("split_failed", 0) } },
    };
}

/** A Paystack body with the payout's fields and metadata added. The amount is the caller's, untouched. */
export function withPayout<T extends Record<string, unknown>>(body: T, p: { fields: Record<string, unknown>; meta: Record<string, unknown> }): T {
    const meta = { ...((body.metadata as Record<string, unknown>) ?? {}) };
    for (const [k, v] of Object.entries(p.meta)) if (v !== undefined) meta[k] = v;
    return { ...body, ...p.fields, metadata: meta };
}

/**
 * Send a Paystack request with the payout split, retrying once without it
 * if Paystack refuses the split (a 4xx). Network errors propagate unchanged,
 * so each caller's existing error handling still applies.
 */
export async function postWithPayout(doFetch: (body: Record<string, unknown>) => Promise<Response>, body: Record<string, unknown>, p: Payout): Promise<Response> {
    const first = await doFetch(withPayout(body, p));
    if (p.dynamic && p.fallback && first.status >= 400 && first.status < 500) {
        console.error("[payout] Paystack refused the admin split; retrying without it", { status: first.status });
        return doFetch(withPayout(body, p.fallback));
    }
    return first;
}
