// Paystack settlements and their transactions, saved as the rows Command
// reads. The mappers at the top are pure; syncPaystackSettlements at the
// bottom is the hourly job, with every outside call injectable.
import { listSettlementsPage, settlementTransactions, type PsResult, type Settlement, type SettlementTx } from "@/lib/paystack/api";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { adminSubaccountCodes } from "./paystackReports";
import { periodFor } from "./period";
import { getBillingSettings, ratesOf, type BillingSettings } from "./settings";
import { billFor, type Bill } from "./statements";

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

// ── The sync ─────────────────────────────────────────────────────────────

export type SyncResult = { skipped: boolean; settlements: number; txs: number; snapshot: boolean; failed: string[] };

type OrderMatch = { id: string; source: string; paystack_reference: string | null; ref: string | null };

export type SyncDeps = {
    /** The switch. Throws when it cannot be read: a broken read never runs a sync silently. */
    enabled: () => Promise<boolean>;
    adminCodes: () => Promise<string[]>;
    listPage: (page: number, perPage: number, from?: string) => Promise<PsResult<{ rows: Settlement[]; raw: unknown[]; pageCount: number }>>;
    txPage: (id: string, subaccountCode: string | null, page: number) => Promise<PsResult<SettlementTx[]>>;
    /** The period's bill with the settings it was priced under. */
    currentBill: (now: Date) => Promise<{ bill: Bill; settings: BillingSettings }>;
    maxSettledAt: () => Promise<string | null>;
    /** The oldest settled_at among saved settlements Paystack has not yet marked successful (still pending or processing). */
    oldestOpenSettledAt: () => Promise<string | null>;
    upsertSettlements: (rows: SettlementRow[]) => Promise<void>;
    /** Admin settlements whose transactions are unsaved, or that settled at or after `recentIso`. */
    settlementsNeedingTxs: (recentIso: string) => Promise<{ id: string; subaccount_code: string | null }[]>;
    ordersFor: (references: string[]) => Promise<OrderMatch[]>;
    upsertTxs: (rows: SettlementTxRow[]) => Promise<void>;
    markTxsSynced: (id: string, iso: string) => Promise<void>;
    upsertSnapshot: (row: SnapshotRow) => Promise<void>;
};

const DAY_MS = 86_400_000;
const LOOKBACK_MS = 3 * DAY_MS;
const SETTLEMENT_PAGE = 50;
const TX_PAGE = 100;
const MAX_PAGES = 200;

/** Paystack settlement statuses that will not change again. Anything else (pending, processing) is re-read on every run. */
const TERMINAL_STATUSES = ["success", "paid"];

const db = supabaseAdmin as any;

function chunks<T>(xs: T[], n: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
    return out;
}

const realDeps: SyncDeps = {
    async enabled() {
        const { data, error } = await db.from("store_settings").select("paystack_sync_enabled").eq("id", "default").maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("no store_settings row");
        return data.paystack_sync_enabled !== false;
    },
    async adminCodes() {
        const s = await getBillingSettings();
        return adminSubaccountCodes(s.adminSubaccountCode);
    },
    listPage: (page, perPage, from) => listSettlementsPage(page, perPage, from),
    txPage: (id, subaccountCode, page) => settlementTransactions(id, subaccountCode, undefined, page),
    async currentBill(now) {
        const settings = await getBillingSettings({ fresh: true });
        const bill = await billFor(periodFor(now, settings.cutoffDay, settings.billingStart), settings, now);
        return { bill, settings };
    },
    async maxSettledAt() {
        const { data, error } = await db.from("paystack_settlements").select("settled_at").not("settled_at", "is", null).order("settled_at", { ascending: false }).limit(1);
        if (error) throw error;
        return data?.[0]?.settled_at ?? null;
    },
    async oldestOpenSettledAt() {
        const { data, error } = await db.from("paystack_settlements").select("settled_at")
            .not("settled_at", "is", null).not("status", "in", `(${TERMINAL_STATUSES.join(",")})`)
            .order("settled_at", { ascending: true }).limit(1);
        if (error) throw error;
        return data?.[0]?.settled_at ?? null;
    },
    async upsertSettlements(rows) {
        if (!rows.length) return;
        const { error } = await db.from("paystack_settlements").upsert(rows, { onConflict: "id" });
        if (error) throw error;
    },
    async settlementsNeedingTxs(recentIso) {
        const { data, error } = await db.from("paystack_settlements").select("id, subaccount_code")
            .eq("is_admin", true).or(`txs_synced_at.is.null,settled_at.gte.${recentIso}`);
        if (error) throw error;
        return data ?? [];
    },
    async ordersFor(references) {
        const found: OrderMatch[] = [];
        for (const part of chunks(references, 100)) {
            const list = part.map(r => `"${r.replace(/["\\]/g, "")}"`).join(",");
            const { data, error } = await db.from("orders").select("id, source, paystack_reference, ref")
                .or(`paystack_reference.in.(${list}),ref.in.(${list})`);
            if (error) throw error;
            found.push(...(data ?? []));
        }
        return found;
    },
    async upsertTxs(rows) {
        if (!rows.length) return;
        const { error } = await db.from("paystack_settlement_txs").upsert(rows, { onConflict: "settlement_id,reference" });
        if (error) throw error;
    },
    async markTxsSynced(id, iso) {
        const { error } = await db.from("paystack_settlements").update({ txs_synced_at: iso }).eq("id", id);
        if (error) throw error;
    },
    async upsertSnapshot(row) {
        const { error } = await db.from("billing_period_snapshot").upsert(row, { onConflict: "period_start" });
        if (error) throw error;
    },
};

/**
 * Saves Paystack's settlements, their transactions and the period's bill for
 * Command to read. Upserts only: nothing is ever deleted (the transactions
 * table references settlements). A failure of any step adds a calm label to
 * `failed`, goes to the log, and the other steps still run.
 */
export async function syncPaystackSettlements(now: Date, deps: Partial<SyncDeps> = {}): Promise<SyncResult> {
    const d: SyncDeps = { ...realDeps };
    for (const [k, v] of Object.entries(deps)) if (v !== undefined) (d as any)[k] = v;
    const result: SyncResult = { skipped: false, settlements: 0, txs: 0, snapshot: false, failed: [] };
    const fail = (label: string, e?: unknown) => {
        console.error(`[settlement-sync] ${label} failed`, e instanceof Error ? e.message : e ?? "");
        if (!result.failed.includes(label)) result.failed.push(label);
    };
    const nowIso = now.toISOString();

    try {
        if (!(await d.enabled())) return { ...result, skipped: true };
    } catch (e) {
        fail("settings", e);
        return { ...result, skipped: true };
    }

    let codes: string[] = [];
    try { codes = await d.adminCodes(); } catch (e) { fail("settings", e); }

    // 1. Settlements. Every page is read before anything is saved: a run that
    // stops half way saves nothing, so the newest-saved date (where the next
    // run starts from) never moves past settlements we have not read yet.
    // The start is three days before the newest saved settlement, or earlier
    // when a saved one is still open, so a pending one is re-read until it settles.
    try {
        const [max, open] = await Promise.all([d.maxSettledAt(), d.oldestOpenSettledAt()]);
        const times = [max ? new Date(max).getTime() - LOOKBACK_MS : NaN, open ? new Date(open).getTime() : NaN].filter(Number.isFinite);
        const from = times.length ? new Date(Math.min(...times)).toISOString().slice(0, 10) : undefined;
        const rows: SettlementRow[] = [];
        let complete = false;
        for (let page = 1, pages = 1; page <= pages; page++) {
            if (page > MAX_PAGES) { fail("settlements", "page limit reached"); break; }
            const r = await d.listPage(page, SETTLEMENT_PAGE, from);
            if (!r.ok) { fail("settlements", r.reason); break; }
            pages = r.data.pageCount;
            rows.push(...r.data.rows.map((s, i) => settlementRow(s, r.data.raw[i], codes, now)));
            if (page >= pages) complete = true;
        }
        if (complete) {
            await d.upsertSettlements(rows);
            result.settlements = rows.length;
        }
    } catch (e) { fail("settlements", e); }

    // 2. Transactions of admin settlements not yet saved, or settled recently.
    try {
        const due = await d.settlementsNeedingTxs(new Date(now.getTime() - LOOKBACK_MS).toISOString());
        for (const st of due) {
            try {
                const txs: SettlementTx[] = [];
                let complete = false;
                for (let page = 1; page <= MAX_PAGES; page++) {
                    const r = await d.txPage(st.id, st.subaccount_code, page);
                    if (!r.ok) { fail("transactions", r.reason); break; }
                    txs.push(...r.data);
                    if (r.data.length < TX_PAGE) { complete = true; break; }
                }
                if (!complete) { fail("transactions", `settlement ${st.id} not fully read`); continue; }
                const unique = [...new Map(txs.filter(t => t.reference).map(t => [t.reference, t])).values()];
                const orders = unique.length ? await d.ordersFor(unique.map(t => t.reference)) : [];
                const byPaystack = new Map(orders.filter(o => o.paystack_reference).map(o => [o.paystack_reference as string, o]));
                const byRef = new Map(orders.filter(o => o.ref).map(o => [o.ref as string, o]));
                const rows = unique.map(t => txRow(st.id, t, byPaystack.get(t.reference) ?? byRef.get(t.reference) ?? null));
                await d.upsertTxs(rows);
                await d.markTxsSynced(st.id, nowIso);
                result.txs += rows.length;
            } catch (e) { fail("transactions", e); }
        }
    } catch (e) { fail("transactions", e); }

    // 3. The period's bill.
    try {
        const { bill, settings } = await d.currentBill(now);
        await d.upsertSnapshot(snapshotRow(bill, settings, now));
        result.snapshot = true;
    } catch (e) { fail("snapshot", e); }

    return result;
}
