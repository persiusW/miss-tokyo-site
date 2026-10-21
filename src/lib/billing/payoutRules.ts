// The admin's share of each online payment, and how much of it a payment
// can carry to the admin payout account. Pure: the checkout, the POS pay
// link, the invoice link and the payout ledger all use these, so the share
// planned when a payment starts is the share recorded when it lands.
//
// What happens today (read from live Paystack, 2026-10-21): the site's split
// SPL_1SuC2NjD2J sends 2.5% of the ORDER TOTAL (goods + delivery + the
// processing fee) to the admin subaccount, and customers pay Paystack's own
// fee on top. Order 3512F7BD: total 137.50 → admin 3.44, main 134.06. That is
// the default rule ("pct_of_order_total" at 2.5%), so switching the automatic
// share on changes nothing anyone receives. The owner's description ("1.95%
// goes to Paystack, the balance to the admin") is kept as an alternative.
import { fromP, toP } from "./money";

export type ShareMode = "pct_of_order_total" | "fee_minus_paystack" | "full_fee" | "custom_pct";
export const SHARE_MODES: readonly ShareMode[] = ["pct_of_order_total", "fee_minus_paystack", "full_fee", "custom_pct"];
export const DEFAULT_SHARE_PCT = 2.5;

export type ShareRule = {
    mode: ShareMode;
    /** pct_of_order_total: % of what the customer is asked for. custom_pct: % of the goods the fee was charged on. */
    pct: number | null;
    /** The admin's figure for Paystack's fee, in %. Reports and this rule only. */
    paystackPct: number;
};

/** A single payment never sends more than this share of itself to the admin account. */
export const MAX_TAKE_SHARE = 0.2;
/** Kept back from the main account's side for Paystack's own fee, beyond the estimate. */
export const PAYSTACK_BUFFER_P = 100;

/**
 * The admin share one payment earns, in GH₵ to the pesewa, never below 0.
 * `totalGhs` is what the shop asks Paystack for (goods + delivery + fee),
 * `feeGhs` the processing fee in it and `baseGhs` what the fee % was charged
 * on (goods after discounts). A payment with no processing fee earns nothing,
 * as with today's split, which only runs on online payments carrying the fee.
 * Every rule but the order-total one stays within the fee itself.
 */
export function shareDue(rule: ShareRule, p: { totalGhs: number; feeGhs: number; baseGhs: number | null }): number {
    const feeP = Math.max(0, toP(p.feeGhs));
    if (feeP === 0) return 0;
    const totalP = Math.max(0, toP(p.totalGhs));
    const baseP = Math.max(0, toP(p.baseGhs ?? 0));
    const pct = Math.max(0, rule.pct ?? 0);
    if (rule.mode === "pct_of_order_total") return fromP(Math.round(totalP * pct / 100));
    let out: number;
    if (rule.mode === "full_fee") out = feeP;
    else if (rule.mode === "custom_pct") out = Math.round(baseP * pct / 100);
    else out = feeP - Math.round(baseP * Math.max(0, rule.paystackPct) / 100);
    return fromP(Math.min(feeP, Math.max(0, out)));
}

/** When a payment's metadata predates the base: the base the fee % implies. */
export function baseFromFee(feeGhs: number, feePct: number): number | null {
    if (!(feePct > 0) || !(feeGhs > 0)) return null;
    return fromP(Math.round(toP(feeGhs) * 100 / feePct));
}

/** Why a payment carried nothing to the admin account. */
export type SkipReason = "switch_off" | "no_account" | "small" | "split_failed";

export type TakePlan = {
    /** GH₵ the admin account receives from this payment (0 when skipped). */
    takeGhs: number;
    /** Pesewas the MAIN account keeps: Paystack's transaction_charge. Null when no split is sent. */
    transactionChargeP: number | null;
    reason: SkipReason | null;
};

/**
 * How much of one payment goes to the admin account: its own share plus
 * whatever is still owed from earlier payments (a negative owed amount is a
 * credit and comes off), capped so the main account always keeps Paystack's
 * fee and most of the money. A payment of `minGhs` or less carries no split
 * (Paystack's smallest subaccount payout; today's code skips the split below
 * GH₵ 5 too) and its share stays owed for a later payment.
 */
export function planTake(a: {
    live: boolean; subaccount: string | null; amountGhs: number; dueGhs: number; owedGhs: number;
    minGhs: number; paystackPct: number;
}): TakePlan {
    if (!a.live) return { takeGhs: 0, transactionChargeP: null, reason: "switch_off" };
    if (!a.subaccount) return { takeGhs: 0, transactionChargeP: null, reason: "no_account" };
    const amountP = Math.max(0, toP(a.amountGhs));
    const targetP = Math.max(0, toP(a.dueGhs) + toP(a.owedGhs));
    const paystackP = Math.ceil(amountP * Math.max(0, a.paystackPct) / 100);
    const capP = Math.max(0, Math.min(Math.floor(amountP * MAX_TAKE_SHARE), amountP - paystackP - PAYSTACK_BUFFER_P));
    const takeP = Math.min(targetP, capP);
    if (amountP <= toP(a.minGhs) || takeP <= 0) return { takeGhs: 0, transactionChargeP: null, reason: "small" };
    return { takeGhs: fromP(takeP), transactionChargeP: amountP - takeP, reason: null };
}

export type LedgerOutcome = "paid_by_split" | "owed" | "no_share";

/**
 * What a landed payment means for the ledger. `planned` is what the payment
 * carried when it started (metadata), or undefined when the switch was off.
 */
export function ledgerOutcome(dueGhs: number, takenGhs: number, planned: SkipReason | "requested" | undefined): { outcome: LedgerOutcome; reason: SkipReason | null } {
    if (toP(takenGhs) > 0) return { outcome: "paid_by_split", reason: null };
    if (toP(dueGhs) <= 0) return { outcome: "no_share", reason: null };
    if (planned === "requested") return { outcome: "owed", reason: "split_failed" };
    return { outcome: "owed", reason: planned ?? "switch_off" };
}

/** The ledger's running position: what was earned, what reached the admin account, what is still owed. */
export function ledgerTotals(rows: { share_due_ghs: number | string; taken_ghs: number | string }[]): { dueGhs: number; takenGhs: number; owedGhs: number } {
    let due = 0, taken = 0;
    for (const r of rows) { due += toP(r.share_due_ghs); taken += toP(r.taken_ghs); }
    return { dueGhs: fromP(due), takenGhs: fromP(taken), owedGhs: fromP(due - taken) };
}

export const SHARE_MODE_TEXT: Record<ShareMode, { title: string; desc: string }> = {
    pct_of_order_total: {
        title: "A % of the whole order total",
        desc: "What the site's Paystack split does today: 2.5% of everything the customer is asked for, delivery and the fee included. Order 3512F7BD: GH₵ 137.50 → GH₵ 3.44 to the admin account.",
    },
    fee_minus_paystack: {
        title: "Processing fee minus Paystack's cut",
        desc: "The fee the shop adds, less the Paystack % of the goods. On GH₵ 100 of goods with a 2.5% fee and Paystack at 1.95%: GH₵ 2.50 − GH₵ 1.95 = GH₵ 0.55.",
    },
    full_fee: {
        title: "The processing fee only",
        desc: "Exactly what the processing fee adds, nothing on delivery. On GH₵ 100 of goods with a 2.5% fee: GH₵ 2.50.",
    },
    custom_pct: {
        title: "A set % of the goods",
        desc: "Your own % of the goods the fee was charged on, never more than the fee itself.",
    },
};
