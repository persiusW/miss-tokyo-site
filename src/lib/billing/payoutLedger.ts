// One payout ledger row per paid online payment that carried a processing
// fee or paid the admin account. Written from every path that learns a
// payment succeeded (webhook charge.success, the success-page verify, the
// nightly reconcile and the admin Verify button); idempotent per Paystack
// reference, so whichever arrives first writes it and the rest do nothing.
//
// What reached the admin account is read off Paystack's own split figures,
// never assumed. While no admin subaccount is stored, the env split group
// (PAYSTACK_SPLIT_CODE) is the admin split by design, so its subaccount
// shares count as paid to the admin. Refunds never change a row.
// Never throws: a ledger failure must not stop a payment being recorded.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { subaccountShareOf, pesewas } from "@/lib/paystack/api";
import { getBillingSettings, shareRuleOf, type BillingSettings } from "./settings";
import { baseFromFee, ledgerOutcome, shareDue, type SkipReason } from "./payoutRules";
import { fromP, numOrNull } from "./money";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PLANNED = new Set(["requested", "switch_off", "no_account", "small", "split_failed"]);

function metaOf(tx: Record<string, unknown>): Record<string, unknown> {
    let m: unknown = tx.metadata;
    if (typeof m === "string") { try { m = JSON.parse(m); } catch { m = null; } }
    return m && typeof m === "object" ? (m as Record<string, unknown>) : {};
}

/** Pesewas that went to the admin from this transaction. */
export function takenFrom(tx: Record<string, unknown>, adminCode: string | null, envSplitCode: string | null): number {
    if (adminCode) return subaccountShareOf(tx, adminCode) ?? 0;
    let split: unknown = tx.split;
    if (typeof split === "string") { try { split = JSON.parse(split); } catch { split = null; } }
    const s = split as Record<string, any> | null;
    if (!s || !envSplitCode || s.split_code !== envSplitCode) return 0;
    const subs = s.shares?.subaccounts;
    return Array.isArray(subs) ? subs.reduce((t: number, e: any) => t + (pesewas(e?.amount) ?? 0), 0) : 0;
}

export type LedgerRow = {
    reference: string; kind: "charge"; source: "checkout" | "pos" | "invoice" | "other";
    order_id: string | null; pos_session_id: string | null; invoice_id: string | null; paid_at: string;
    amount_ghs: number; charged_ghs: number | null; fee_ghs: number; fee_base_ghs: number | null;
    share_due_ghs: number; taken_ghs: number; outcome: string; skip_reason: SkipReason | null;
    subaccount_code: string | null; rule: Record<string, unknown>;
};

/** The row for one successful Paystack transaction, or null when it carries nothing for the ledger. Pure. */
export function ledgerRowFor(tx: Record<string, unknown>, s: BillingSettings, opts: { envSplitCode: string | null; feePct: number | null }): LedgerRow | null {
    const reference = typeof tx.reference === "string" ? tx.reference : "";
    if (!reference || (tx.status !== undefined && tx.status !== "success")) return null;
    const meta = metaOf(tx);
    const fee = numOrNull(meta.platform_fee_amount) ?? 0;
    const requestedP = pesewas(tx.requested_amount) ?? pesewas(tx.amount) ?? 0;
    const chargedP = pesewas(tx.amount);
    const takenP = takenFrom(tx, s.adminSubaccountCode, opts.envSplitCode);
    if (!(fee > 0) && takenP <= 0) return null;

    const base = numOrNull(meta.platform_fee_base) ?? (opts.feePct ? baseFromFee(fee, opts.feePct) : null);
    const plan = (meta.admin_payout && typeof meta.admin_payout === "object" ? meta.admin_payout : {}) as Record<string, unknown>;
    const planned = PLANNED.has(String(plan.r)) ? (plan.r as SkipReason | "requested") : undefined;
    // The share planned when the payment started wins, so start and finish agree.
    const due = numOrNull(plan.due) ?? shareDue(shareRuleOf(s), { totalGhs: requestedP / 100, feeGhs: fee, baseGhs: base });
    const taken = fromP(takenP);
    const { outcome, reason } = ledgerOutcome(due, taken, planned);
    const src = meta.source === "pos" ? "pos" : meta.source === "invoice" ? "invoice" : meta.orderId || meta.order_id ? "checkout" : "other";
    const orderId = [meta.orderId, meta.order_id].find(v => typeof v === "string" && UUID.test(v)) as string | undefined;
    const pos = typeof meta.pos_session_id === "string" && UUID.test(meta.pos_session_id) ? meta.pos_session_id : null;
    const paidAt = [tx.paid_at, tx.paidAt, tx.transaction_date].find(v => typeof v === "string" && !Number.isNaN(Date.parse(v))) as string | undefined;
    return {
        reference, kind: "charge", source: src, order_id: orderId ?? null, pos_session_id: pos,
        invoice_id: typeof meta.invoice_id === "string" ? meta.invoice_id.slice(0, 80) : null,
        paid_at: paidAt ?? new Date().toISOString(),
        amount_ghs: requestedP / 100, charged_ghs: chargedP == null ? null : chargedP / 100,
        fee_ghs: fee, fee_base_ghs: base, share_due_ghs: due, taken_ghs: taken,
        outcome, skip_reason: reason,
        subaccount_code: s.adminSubaccountCode,
        rule: { mode: s.shareMode, pct: s.sharePct, paystack_pct: s.paystackFeePct, live: s.payoutSplitLive, planned: planned ?? null },
    };
}

async function storeFeePct(): Promise<number | null> {
    const { data } = await supabaseAdmin.from("store_settings").select("platform_fee_percentage").eq("id", "default").maybeSingle();
    return numOrNull(data?.platform_fee_percentage);
}

/** Record one successful transaction. Safe to call any number of times. */
export async function recordAdminPayout(tx: unknown): Promise<void> {
    try {
        if (!tx || typeof tx !== "object") return;
        const s = await getBillingSettings();
        const t = tx as Record<string, unknown>;
        const needsBase = numOrNull(metaOf(t).platform_fee_base) == null;
        const row = ledgerRowFor(t, s, { envSplitCode: process.env.PAYSTACK_SPLIT_CODE ?? null, feePct: needsBase ? await storeFeePct() : null });
        if (!row) return;
        const { error } = await (supabaseAdmin as any).from("admin_payout_ledger").upsert(row, { onConflict: "reference", ignoreDuplicates: true });
        if (error) console.error("[payout ledger] could not record", { code: error.code });
    } catch (e) {
        console.error("[payout ledger] failed", String((e as Error)?.message ?? e).slice(0, 200));
    }
}
