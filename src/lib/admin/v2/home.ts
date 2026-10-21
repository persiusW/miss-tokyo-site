// Server side of admin v2 Home: every figure the page shows, read with the
// service role after the caller's staff check (route or page). Nothing is
// estimated: a figure that can't be read is left out, never guessed.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAiSettings } from "@/lib/ai/settings";
import { createChatbotsAfrica } from "@/lib/messaging/chatbotsAfrica";
import { walletIsLow } from "@/lib/whatsapp/walletAlertRules";
import { fulKey, type FulKey } from "@/components/admin/ui/status";
import { activityText, QUIET_ACTIONS } from "@/lib/admin/activityText";
import type { StaffRole } from "@/lib/admin/v2/server";
import { inboxBreakdown, toPackCount } from "./counts";
import { applyReady, applyToPack, applyUnpaid } from "./orderViews";
import { channelLabel, itemCount, kpiDeltas, periodRange, type PeriodKey, type SalesFigures, type KpiDeltas } from "./homeText";
import type { NeedsData } from "./homeNeeds";
import type { LowRow } from "./lowStock";

const DAY = 86_400_000;
const refOf = (o: { ref?: string | null; id: string }) => (o.ref || o.id.slice(0, 8)).toUpperCase();

function must<T extends { error: unknown }>(r: T): T {
    if (r.error) throw r.error;
    return r;
}

type Row = Record<string, unknown>;
const first = (r: { data: unknown }): Row | null => (Array.isArray(r.data) && r.data[0] ? (r.data[0] as Row) : null);
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

async function orderNeeds(now: Date): Promise<Pick<NeedsData, "toPack" | "unpaid" | "ready">> {
    const dayAgo = new Date(now.getTime() - DAY).toISOString();
    const orders = () => supabaseAdmin.from("orders");
    const head = () => orders().select("id", { count: "exact", head: true });
    const [toPack, packOldest, unpaid, unpaidStale, staleOldest] = await Promise.all([
        toPackCount(),
        applyToPack(orders().select("paid_at, created_at")).order("created_at", { ascending: true }).limit(1).then(must),
        applyUnpaid(head()).then(must),
        applyUnpaid(head()).lt("created_at", dayAgo).then(must),
        applyUnpaid(orders().select("id, ref, created_at")).lt("created_at", dayAgo).order("created_at", { ascending: true }).limit(1).then(must),
    ]);
    const [ready, readyUndated, readyOldest, readyAny] = await Promise.all([
        applyReady(head()).then(must),
        applyReady(head()).is("ready_at", null).then(must),
        applyReady(orders().select("id, ref, ready_at")).not("ready_at", "is", null).order("ready_at", { ascending: true }).limit(1).then(must),
        applyReady(orders().select("id, ref, ready_at")).order("created_at", { ascending: true }).limit(1).then(must),
    ]);
    const po = first(packOldest);
    const so = first(staleOldest);
    const rp = first(readyOldest) ?? first(readyAny);
    const ref = (r: Row) => refOf({ id: String(r.id), ref: str(r.ref) });
    return {
        toPack: { count: toPack, oldest: po ? { paid_at: str(po.paid_at), created_at: String(po.created_at) } : null },
        unpaid: { count: unpaid.count ?? 0, staleCount: unpaidStale.count ?? 0, stale: so ? [{ id: String(so.id), ref: ref(so), at: str(so.created_at) }] : [] },
        ready: { count: ready.count ?? 0, undated: readyUndated.count ?? 0, oldest: rp ? { id: String(rp.id), ref: ref(rp), at: str(rp.ready_at) } : null },
    };
}

async function stockNeeds(): Promise<Pick<NeedsData, "lowStock" | "noPhoto">> {
    const lowRpc = () => supabaseAdmin.rpc("fn_low_stock_variants", {}, { count: "exact", head: true });
    // No archive state exists yet, so every product without a photo counts
    // (active and inactive). Products › No photo should use the same filter.
    const [low, soldOut, lowExample, levelMin, levelMax, photoCount, photoExample] = await Promise.all([
        lowRpc().then(must),
        lowRpc().lte("inventory_count", 0).then(must),
        supabaseAdmin.rpc("fn_low_stock_variants").order("inventory_count", { ascending: true }).order("product_name", { ascending: true }).limit(1).then(must),
        supabaseAdmin.from("products").select("low_stock_at").eq("is_active", true).order("low_stock_at", { ascending: true }).limit(1).then(must),
        supabaseAdmin.from("products").select("low_stock_at").eq("is_active", true).order("low_stock_at", { ascending: false }).limit(1).then(must),
        supabaseAdmin.from("products").select("id", { count: "exact", head: true })
            .or("image_urls.is.null,image_urls.eq.{}").or("media.is.null,media.eq.[]").then(must),
        supabaseAdmin.from("products").select("name, is_active")
            .or("image_urls.is.null,image_urls.eq.{}").or("media.is.null,media.eq.[]")
            .order("is_active", { ascending: false }).order("created_at", { ascending: false }).limit(1).then(must),
    ]);
    const levels = [first(levelMin)?.low_stock_at, first(levelMax)?.low_stock_at].filter((x): x is number => typeof x === "number");
    const ex = first(lowExample) as LowRow | null;
    const photo = first(photoExample);
    return {
        lowStock: { count: low.count ?? 0, soldOut: soldOut.count ?? 0, levels: levels.length ? levels : [2], example: ex },
        noPhoto: { count: photoCount.count ?? 0, example: photo ? { name: String(photo.name ?? "").trim(), active: photo.is_active === true } : null },
    };
}

async function returnNeeds(): Promise<NeedsData["returns"]> {
    const [count, one] = await Promise.all([
        supabaseAdmin.from("return_requests").select("id", { count: "exact", head: true }).eq("status", "new").then(must),
        supabaseAdmin.from("return_requests").select("order_id").eq("status", "new").order("created_at", { ascending: true }).limit(1).then(must),
    ]);
    return { count: count.count ?? 0, orderId: str(first(one)?.order_id) };
}

export async function loadNeeds(role: StaffRole, now: Date): Promise<NeedsData> {
    const [o, s, inbox, returns] = await Promise.all([orderNeeds(now), stockNeeds(), inboxBreakdown(role), returnNeeds()]);
    return { ...o, ...s, inbox, returns };
}

export type SalesSummary = {
    period: PeriodKey;
    current: SalesFigures;
    compare: SalesFigures | null;
    deltas: KpiDeltas;
};

const ZERO: SalesFigures = { sales: 0, orders: 0, items: 0, aov: 0, cash: 0, cash_orders: 0 };
function figures(v: unknown): SalesFigures | null {
    if (!v || typeof v !== "object") return null;
    const o = v as Record<string, unknown>;
    const n = (k: keyof SalesFigures) => (Number.isFinite(Number(o[k])) ? Number(o[k]) : 0);
    return { sales: n("sales"), orders: n("orders"), items: n("items"), aov: n("aov"), cash: n("cash"), cash_orders: n("cash_orders") };
}

/** Sales so far for the period and the same stretch before it (fn_sales_summary). */
export async function loadSales(period: PeriodKey, now: Date): Promise<SalesSummary> {
    const r = periodRange(period, now);
    const { data, error } = await supabaseAdmin.rpc("fn_sales_summary", {
        p_from: r.from.toISOString(), p_to: r.to.toISOString(), p_cmp_from: r.cmpFrom.toISOString(), p_cmp_to: r.cmpTo.toISOString(),
    });
    if (error) throw error;
    const body = (data ?? {}) as { current?: unknown; compare?: unknown };
    const current = figures(body.current) ?? ZERO;
    const compare = figures(body.compare);
    return { period, current, compare, deltas: kpiDeltas(current, compare) };
}

export type LatestOrder = { id: string; ref: string; customer: string; created_at: string; channel: string; items: number; ful: FulKey; pickup: boolean; total: number };

export async function loadLatest(): Promise<LatestOrder[]> {
    const { data, error } = await supabaseAdmin.from("orders")
        .select("id, ref, customer_name, customer_email, created_at, source, payment_method, items, status, payment_status, fulfillment_status, delivery_method, total_amount")
        .order("created_at", { ascending: false }).limit(6);
    if (error) throw error;
    return (data ?? []).map(o => ({
        id: o.id, ref: refOf(o), customer: (o.customer_name || o.customer_email || "Walk-in customer").trim(),
        created_at: o.created_at, channel: channelLabel(o.source, o.payment_method), items: itemCount(o.items),
        ful: fulKey(o), pickup: (o.delivery_method || "").toLowerCase().includes("pick"), total: Number(o.total_amount ?? 0),
    }));
}

export type TeamActivity = { id: string; who: string; what: string; href?: string; created_at: string };

export async function loadActivity(): Promise<TeamActivity[]> {
    const { data, error } = await supabaseAdmin.from("activity_logs")
        .select("id, user_id, action_type, resource, resource_id, details, created_at")
        .not("action_type", "in", `(${QUIET_ACTIONS.join(",")})`)
        .order("created_at", { ascending: false }).limit(5);
    if (error) throw error;
    const ids = [...new Set((data ?? []).map(a => a.user_id).filter(Boolean))] as string[];
    const names = new Map<string, string>();
    if (ids.length) {
        const p = await supabaseAdmin.from("profiles").select("id, full_name, email").in("id", ids);
        for (const r of p.data ?? []) names.set(r.id, (r.full_name || r.email || "").trim());
    }
    return (data ?? []).map(a => {
        const t = activityText(a);
        return { id: a.id, who: names.get(a.user_id) || "Someone on the team", what: t.what, href: t.href, created_at: a.created_at };
    });
}

/** Paid orders the nightly Paystack check found cancelled in the store and put back to pack (reconcile-payments). */
export async function loadRestored(now: Date): Promise<{ count: number; first: { id: string; ref: string } | null }> {
    const since = new Date(now.getTime() - 7 * DAY).toISOString();
    const base = () => applyToPack(supabaseAdmin.from("orders").select("id, ref", { count: "exact" }))
        .eq("customer_metadata->>reconciled_from", "cancelled")
        .gte("customer_metadata->>reconciled_at", since);
    const { data, count, error } = await base().order("created_at", { ascending: true }).limit(1);
    if (error) throw error;
    const f = data?.[0];
    return { count: count ?? 0, first: f ? { id: f.id, ref: refOf(f) } : null };
}

// The provider is asked at most every 5 minutes per server instance.
let walletCache: { at: number; value: { balance: number } | null } | null = null;

/** The Chatbots Africa wallet when it's below the alert level, read live; null when it isn't low or can't be read. */
export async function loadWalletLow(): Promise<{ balance: number } | null> {
    if (walletCache && Date.now() - walletCache.at < 5 * 60_000) return walletCache.value;
    const settings = await getAiSettings();
    let value: { balance: number } | null = null;
    if (settings.whatsappEnabled && settings.walletAlertGhs > 0) {
        const r = await createChatbotsAfrica().balance().catch(() => null);
        if (r?.ok && r.balance != null && walletIsLow(r.balance, settings.walletAlertGhs)) value = { balance: r.balance };
    }
    walletCache = { at: Date.now(), value };
    return value;
}
