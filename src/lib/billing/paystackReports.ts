// Miss Tokyo's own Paystack account, for Billing and Admin Tools: what
// settled where, and the period's online payments. Server-only. Paystack
// answers are cached ten minutes; a slow Paystack gives a calm "couldn't
// check" instead of an empty list that looks like no money.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSplit, listSettlements, settlementTransactions, type Settlement, type SettlementTx, type PsResult } from "@/lib/paystack/api";
import { cachedPs, TEN_MIN } from "@/lib/paystack/cache";
import { fromP, toP } from "./money";

const db = supabaseAdmin as any;

/** The admin's subaccount code: the stored one, else the one in the site's env split group. */
export async function adminSubaccountCodes(stored: string | null): Promise<string[]> {
    const codes = new Set<string>();
    if (stored) codes.add(stored);
    const env = process.env.PAYSTACK_SPLIT_CODE;
    if (env) {
        const s = await cachedPs(`split:${env}`, TEN_MIN, () => getSplit(env));
        if (s.ok) for (const sh of s.data.shares) if (sh.subaccountCode) codes.add(sh.subaccountCode);
    }
    return [...codes];
}

export type SettlementView = { checkedAt: number | null } & (
    | { ok: true; main: Settlement[]; admin: Settlement[] }
    | { ok: false; reason: "not_configured" | "unavailable" | "refused" });

export async function settlementsView(adminCodes: string[]): Promise<SettlementView> {
    const r = await cachedPs("settlements:50", TEN_MIN, () => listSettlements(50));
    if (!r.ok) return { ok: false, reason: r.reason, checkedAt: null };
    return {
        ok: true, checkedAt: r.at ?? null,
        main: r.data.filter(s => !s.subaccountCode),
        admin: r.data.filter(s => s.subaccountCode && adminCodes.includes(s.subaccountCode)),
    };
}

/** What savedSettlementsView reads: the saved rows and when the sync last finished well. Injectable for tests. */
export type SavedReader = () => Promise<{ rows: SavedSettlementRow[]; syncedAt: string | null }>;
export type SavedSettlementRow = { id: string; status: string; settled_at: string | null; fees_ghs: number | null; net_ghs: number; subaccount_code: string | null };

const readSaved: SavedReader = async () => {
    const [s, c] = await Promise.all([
        db.from("paystack_settlements").select("id, status, settled_at, fees_ghs, net_ghs, subaccount_code").order("settled_at", { ascending: false, nullsFirst: false }).limit(50),
        db.from("cron_runs").select("finished_at").eq("job", "paystack-sync").eq("ok", true).order("finished_at", { ascending: false }).limit(1),
    ]);
    if (s.error) throw s.error;
    return {
        rows: ((s.data ?? []) as any[]).map(r => ({ ...r, net_ghs: Number(r.net_ghs), fees_ghs: r.fees_ghs == null ? null : Number(r.fees_ghs) })),
        // The last-synced time is a nicety: if its read fails the list still shows.
        syncedAt: c.error ? null : ((c.data ?? [])[0]?.finished_at ?? null),
    };
};

/**
 * The same view as settlementsView, from the rows the hourly sync saved.
 * The admin/main split uses the admin codes passed in, exactly as the live
 * view does. A read failure is a calm "unavailable"; the detail is logged.
 */
export async function savedSettlementsView(adminCodes: string[], read: SavedReader = readSaved): Promise<SettlementView & { syncedAt: string | null }> {
    try {
        const { rows, syncedAt } = await read();
        const all: Settlement[] = rows.map(r => ({ id: r.id, status: r.status, amountGhs: r.net_ghs, feesGhs: r.fees_ghs, settledAt: r.settled_at, subaccountCode: r.subaccount_code }));
        return {
            ok: true, checkedAt: null, syncedAt,
            main: all.filter(s => !s.subaccountCode),
            admin: all.filter(s => s.subaccountCode && adminCodes.includes(s.subaccountCode)),
        };
    } catch (e) {
        console.error("[saved-settlements] read failed", e instanceof Error ? e.message : e);
        return { ok: false, reason: "unavailable", checkedAt: null, syncedAt: null };
    }
}

/** Saved settlements when the sync switch is on, else live from Paystack. An unreadable switch falls back to live. */
export async function settlementsFor(adminCodes: string[]): Promise<SettlementView & { syncedAt?: string | null }> {
    let on = false;
    try {
        const { data, error } = await db.from("store_settings").select("paystack_sync_enabled").eq("id", "default").maybeSingle();
        if (error) throw error;
        on = !!data && data.paystack_sync_enabled !== false;
    } catch (e) {
        console.error("[saved-settlements] switch unreadable, reading live", e instanceof Error ? e.message : e);
    }
    return on ? savedSettlementsView(adminCodes) : settlementsView(adminCodes);
}

export async function settlementDetail(id: string, subaccountCode: string | null): Promise<PsResult<SettlementTx[]>> {
    return cachedPs(`settlement:${id}:${subaccountCode ?? "main"}`, TEN_MIN, () => settlementTransactions(id, subaccountCode));
}

export type PaymentsSummary = {
    count: number;
    /** What the shop asked customers for (order totals, processing fee included). */
    ordersGhs: number;
    /** What customers were actually debited (Paystack's figure where stored). */
    chargedGhs: number;
    /** Paystack's fees: stored per order, else estimated at the admin's Paystack %. */
    paystackFeesGhs: number;
    estimatedFees: number;
    /** Of those fees, the part customers paid on top of the order total. */
    feesPaidByCustomersGhs: number;
    /** Order totals less the Paystack fees the shop itself bore. Before any split. */
    netGhs: number;
    avgChargeGhs: number | null;
};

type OrderMoney = { total_amount: unknown; paystack_charged: unknown; paystack_fee: unknown };

/** Pure: the summary from order rows. */
export function summarisePayments(rows: OrderMoney[], paystackPct: number): PaymentsSummary {
    let orders = 0, charged = 0, fees = 0, byCustomer = 0, net = 0, est = 0;
    for (const r of rows) {
        const totalP = toP(r.total_amount as number);
        const storedFee = r.paystack_fee == null ? null : toP(r.paystack_fee as number);
        const chargedP = r.paystack_charged == null ? null : toP(r.paystack_charged as number);
        const feeP = storedFee ?? Math.round((chargedP ?? totalP) * paystackPct / 100);
        if (storedFee == null) est += 1;
        const paidOnTop = chargedP != null ? chargedP > totalP : storedFee == null; // the gross-up is how the account is set today
        const cP = chargedP ?? (paidOnTop ? totalP + feeP : totalP);
        orders += totalP; charged += cP; fees += feeP;
        if (paidOnTop) { byCustomer += feeP; net += totalP; } else net += totalP - feeP;
    }
    return {
        count: rows.length, ordersGhs: fromP(orders), chargedGhs: fromP(charged), paystackFeesGhs: fromP(fees), estimatedFees: est,
        feesPaidByCustomersGhs: fromP(byCustomer), netGhs: fromP(net), avgChargeGhs: rows.length ? fromP(Math.round(fees / rows.length)) : null,
    };
}

/** Paid online orders in [fromIso, toIso), paged past the 1000-row cap. */
export async function paymentsSummary(fromIso: string, toIso: string, paystackPct: number): Promise<PaymentsSummary> {
    const rows: OrderMoney[] = [];
    for (let from = 0; ; from += 1000) {
        const { data, error } = await db.from("orders").select("id, total_amount, paystack_charged, paystack_fee")
            .in("payment_status", ["paid", "refunded", "partly_refunded"]).not("paystack_reference", "is", null).neq("paystack_reference", "dummy-ref")
            .gte("paid_at", fromIso).lt("paid_at", toIso).order("paid_at").order("id").range(from, from + 999);
        if (error) throw error;
        rows.push(...(data ?? []));
        if ((data ?? []).length < 1000) break;
    }
    return summarisePayments(rows, paystackPct);
}
