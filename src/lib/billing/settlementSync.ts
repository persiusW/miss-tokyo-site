// Paystack settlements and their transactions, mapped to the rows Command
// reads. Pure: no network, no database. The hourly sync (same file, below)
// fetches, maps with these and saves.
import type { Settlement, SettlementTx } from "@/lib/paystack/api";
import { ratesOf, type BillingSettings } from "./settings";
import type { Bill } from "./statements";

const r2 = (n: number) => Math.round(n * 100) / 100;

export type TxSource = "checkout" | "pos" | "invoice" | "other";

export type SettlementRow = {
    id: string; subaccount_code: string | null; is_admin: boolean; status: string; settled_at: string | null;
    gross_ghs: number; fees_ghs: number | null; net_ghs: number; raw: unknown; synced_at: string;
};

export type SettlementTxRow = {
    settlement_id: string; reference: string; order_id: string | null; source: TxSource;
    amount_ghs: number; admin_share_ghs: number | null; paystack_cut_ghs: number | null; paid_at: string | null; raw: unknown;
};

export type SnapshotRow = {
    period_start: string; period_end: string; computed_at: string; internal: Record<string, unknown>; total_ghs: number; base_ghs: number;
};

/**
 * Where a payment came from, off its order's `source`. Storefront and
 * chat-built orders pay at checkout; POS is the till; WhatsApp orders are paid
 * from an invoice link. No order, or a source we do not know, is "other".
 */
export function sourceOf(orderSource: string | null | undefined): TxSource {
    switch (orderSource) {
        case "storefront": case "web_chat": return "checkout";
        case "pos": return "pos";
        case "whatsapp": return "invoice";
        default: return "other";
    }
}

export function settlementRow(s: Settlement, raw: unknown, adminCodes: string[], now: Date): SettlementRow {
    return {
        id: s.id, subaccount_code: s.subaccountCode, is_admin: adminCodes.includes(s.subaccountCode ?? ""),
        status: s.status, settled_at: s.settledAt,
        gross_ghs: r2(s.amountGhs + (s.feesGhs ?? 0)), fees_ghs: s.feesGhs, net_ghs: s.amountGhs,
        raw, synced_at: now.toISOString(),
    };
}

export function txRow(settlementId: string, tx: SettlementTx, order: { id: string; source: string } | null): SettlementTxRow {
    return {
        settlement_id: settlementId, reference: tx.reference, order_id: order?.id ?? null, source: sourceOf(order?.source),
        amount_ghs: tx.amountGhs, admin_share_ghs: tx.subaccountShareGhs, paystack_cut_ghs: tx.feesGhs,
        paid_at: tx.paidAt, raw: tx.raw,
    };
}

/** The period's bill as saved for Command. `internal` is built exactly as freezeStatement builds a frozen statement's. */
export function snapshotRow(bill: Bill, s: BillingSettings, now: Date): SnapshotRow {
    return {
        period_start: bill.period.start, period_end: bill.period.end, computed_at: now.toISOString(),
        internal: { usage: bill.usage, rates: ratesOf(s), markupPct: s.markupPct, priced: bill.priced, visibility: s.ownerVisibility },
        total_ghs: bill.totalGhs,
        base_ghs: r2(bill.priced.filter(l => l.priced).reduce((sum, l) => sum + l.baseGhs, 0)),
    };
}
