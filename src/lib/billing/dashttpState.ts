// Dashttp's billing reply, cached in dashttp_state so Billing loads fast and
// still shows the last known plan when Dashttp is slow or down. A webhook
// event marks the cache stale (billing_at = null). Server-only.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { dashttpMode, getDashttpBilling, getUsageInvoice, parseBilling, parseReceipt, type DashttpBilling, type DashttpMode, type DashttpReceipt } from "./dashttp";

const db = supabaseAdmin as any;
const FRESH_MS = 10 * 60_000;

export type BillingState = {
    mode: DashttpMode;
    billing: DashttpBilling | null;
    /** When that reply was fetched. */
    at: string | null;
    /** True when Dashttp didn't answer just now and this is the last good reply. */
    stale: boolean;
    /** Receipts from webhooks and the reply, newest first, no duplicates. */
    receipts: DashttpReceipt[];
    reason: "not_connected" | "unavailable" | "refused" | null;
};

export async function loadDashttpBilling(opts: { fresh?: boolean } = {}): Promise<BillingState> {
    const mode = dashttpMode();
    const { data: row } = await db.from("dashttp_state").select("billing, billing_at, receipts").eq("id", "default").maybeSingle().then((r: any) => r, () => ({ data: null }));
    const cached = row?.billing ? parseBilling(row.billing) : null;
    const hooked = (Array.isArray(row?.receipts) ? row.receipts : []).map(parseReceipt);
    const merge = (b: DashttpBilling | null) => {
        const all = [...hooked, ...(b?.recentReceipts ?? [])];
        const seen = new Set<string>();
        return all.filter(r => r.id && !seen.has(r.id) && seen.add(r.id)).sort((a, b) => String(b.paidAt).localeCompare(String(a.paidAt))).slice(0, 24);
    };
    if (mode === "off") return { mode, billing: null, at: null, stale: false, receipts: [], reason: "not_connected" };
    const fresh = row?.billing_at && Date.now() - new Date(row.billing_at).getTime() < FRESH_MS;
    if (mode === "live" && cached && fresh && !opts.fresh) return { mode, billing: cached, at: row.billing_at, stale: false, receipts: merge(cached), reason: null };
    const r = await getDashttpBilling();
    if (r.ok) {
        const now = new Date().toISOString();
        if (mode === "live") await db.from("dashttp_state").upsert({ id: "default", billing: r.data, billing_at: now, updated_at: now }, { onConflict: "id" }).then(() => null, () => null);
        return { mode, billing: r.data, at: now, stale: false, receipts: merge(r.data), reason: null };
    }
    return { mode, billing: cached, at: row?.billing_at ?? null, stale: !!cached, receipts: merge(cached), reason: r.reason };
}

/** After Paystack sends the client back from paying an invoice: ask Dashttp, and record it on our statement if paid. */
export async function confirmInvoicePayment(invoiceId: string): Promise<"paid" | "open" | "unknown"> {
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(invoiceId)) return "unknown";
    const r = await getUsageInvoice(invoiceId);
    if (!r.ok) return "unknown";
    if (r.data.status !== "paid") return "open";
    if (dashttpMode() === "live") {
        const now = new Date().toISOString();
        await db.from("billing_statements").update({ status: "paid", dashttp_status: "paid", paid_at: now, updated_at: now }).eq("dashttp_invoice_id", invoiceId).neq("status", "paid");
        await db.from("dashttp_state").update({ billing_at: null, updated_at: now }).eq("id", "default");
    }
    return "paid";
}
