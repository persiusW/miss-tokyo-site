// Server-only reads for each Admin Tools tab. Every caller has already
// passed requireV2Page("tools", …, ["admin"]). Each tab's parts load on their
// own and report their own failure, so one slow source never hides the rest.
import vercelConfig from "../../../../../vercel.json";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getBillingSettings, type BillingSettings } from "@/lib/billing/settings";
import { getSplit, listSplits, fetchSubaccount, getBalance, type Split, type Subaccount } from "@/lib/paystack/api";
import { cachedPs, TEN_MIN } from "@/lib/paystack/cache";
import { adminSubaccountCodes, settlementsFor, type SettlementView } from "@/lib/billing/paystackReports";
import { currentBill, listStatements, type Bill, type StatementRow } from "@/lib/billing/statements";
import { loadOtherLines } from "@/lib/billing/usageLoad";
import { dashttpMode, type DashttpMode } from "@/lib/billing/dashttp";
import { numOrNull } from "@/lib/billing/money";
import { SWITCHES } from "./switchList";
import { ERROR_CODES, errorText } from "./errorText";

const db = supabaseAdmin as any;

export type Part<T> = { ok: true; data: T } | { ok: false };
async function part<T>(fn: () => Promise<T>, where: string): Promise<Part<T>> {
    try { return { ok: true, data: await fn() }; } catch (e) {
        console.error(`[tools] ${where}`, String((e as Error)?.message ?? e).slice(0, 200));
        return { ok: false };
    }
}

// ── Payouts ─────────────────────────────────────────────────────────────

export type LedgerView = {
    id: string; reference: string; kind: string; source: string | null; order_id: string | null; paid_at: string;
    amount_ghs: number; charged_ghs: number | null; fee_ghs: number; share_due_ghs: number; taken_ghs: number;
    outcome: string; skip_reason: string | null; note: string | null; order_ref: string | null;
};
export type LedgerTotals = { dueGhs: number; takenGhs: number; owedGhs: number; paidMonthGhs: number; rows: number };

export async function loadLedger(limit = 100): Promise<{ totals: LedgerTotals; rows: LedgerView[] }> {
    const [t, r] = await Promise.all([
        db.rpc("fn_admin_payout_totals"),
        db.from("admin_payout_ledger").select("id, reference, kind, source, order_id, paid_at, amount_ghs, charged_ghs, fee_ghs, share_due_ghs, taken_ghs, outcome, skip_reason, note")
            .order("paid_at", { ascending: false }).limit(limit),
    ]);
    if (t.error) throw t.error;
    if (r.error) throw r.error;
    const row = Array.isArray(t.data) ? t.data[0] : t.data;
    const ids = [...new Set((r.data ?? []).map((x: any) => x.order_id).filter(Boolean))];
    const refs = new Map<string, string>();
    if (ids.length) {
        const { data } = await db.from("orders").select("id, ref").in("id", ids);
        for (const o of data ?? []) refs.set(o.id, o.ref ?? String(o.id).slice(0, 8).toUpperCase());
    }
    const n = (v: unknown) => numOrNull(v) ?? 0;
    return {
        totals: { dueGhs: n(row?.due_ghs), takenGhs: n(row?.taken_ghs), owedGhs: n(row?.owed_ghs), paidMonthGhs: n(row?.paid_month_ghs), rows: n(row?.rows_count) },
        rows: (r.data ?? []).map((x: any) => ({
            ...x, amount_ghs: n(x.amount_ghs), charged_ghs: numOrNull(x.charged_ghs), fee_ghs: n(x.fee_ghs), share_due_ghs: n(x.share_due_ghs), taken_ghs: n(x.taken_ghs),
            order_ref: x.order_id ? refs.get(x.order_id) ?? null : null,
        })),
    };
}

export type PayoutsData = {
    settings: BillingSettings;
    envSplitCode: string | null;
    envSplit: Part<Split | null>;
    otherSplits: Part<Split[]>;
    adminAccount: Part<Subaccount | null>;
    balance: Part<{ currency: string; balanceGhs: number }[]>;
    /** `syncedAt` is present (maybe null) only when read from the saved rows. */
    settlements: SettlementView & { syncedAt?: string | null };
    ledger: Part<{ totals: LedgerTotals; rows: LedgerView[] }>;
    paystackConnected: boolean;
};

const psPart = <T>(r: { ok: true; data: T } | { ok: false }): Part<T> => (r.ok ? { ok: true, data: r.data } : { ok: false });

export async function loadPayouts(): Promise<PayoutsData> {
    const settings = await getBillingSettings({ fresh: true });
    const envSplitCode = process.env.PAYSTACK_SPLIT_CODE || null;
    const [envSplit, splits, account, balance, ledger] = await Promise.all([
        envSplitCode ? cachedPs(`split:${envSplitCode}`, TEN_MIN, () => getSplit(envSplitCode)) : Promise.resolve({ ok: true as const, data: null }),
        cachedPs("splits:all", TEN_MIN, () => listSplits()),
        settings.adminSubaccountCode ? cachedPs(`subaccount:${settings.adminSubaccountCode}`, TEN_MIN, () => fetchSubaccount(settings.adminSubaccountCode!)) : Promise.resolve({ ok: true as const, data: null }),
        cachedPs("balance", 5 * 60_000, () => getBalance()),
        part(() => loadLedger(100), "ledger"),
    ]);
    const settlements = await settlementsFor(await adminSubaccountCodes(settings.adminSubaccountCode));
    return {
        settings, envSplitCode, envSplit: psPart(envSplit),
        otherSplits: splits.ok ? { ok: true, data: splits.data.filter(s => s.code !== envSplitCode) } : { ok: false },
        adminAccount: psPart(account), balance: psPart(balance), settlements, ledger,
        paystackConnected: !!process.env.PAYSTACK_SECRET_KEY,
    };
}

// ── Fees ────────────────────────────────────────────────────────────────

export type FeesData = {
    fee: { pct: number; label: string; showLine: boolean } | null;
    paystackPct: number;
    staleRow: { pct: number; label: string } | null;
    sharePct: number; shareMode: string;
};

export async function loadFees(): Promise<FeesData> {
    const [rows, s] = await Promise.all([
        db.from("store_settings").select("id, platform_fee_percentage, platform_fee_label, show_fee_at_checkout"),
        getBillingSettings({ fresh: true }),
    ]);
    const list = (rows.data ?? []) as any[];
    const d = list.find(r => r.id === "default");
    const stale = list.find(r => r.id !== "default");
    return {
        fee: d ? { pct: Number(d.platform_fee_percentage) || 0, label: String(d.platform_fee_label ?? ""), showLine: d.show_fee_at_checkout === true } : null,
        paystackPct: s.paystackFeePct,
        staleRow: stale ? { pct: Number(stale.platform_fee_percentage) || 0, label: String(stale.platform_fee_label ?? "") } : null,
        sharePct: s.sharePct, shareMode: s.shareMode,
    };
}

// ── Rates ───────────────────────────────────────────────────────────────

export type RatesData = {
    settings: BillingSettings;
    bill: Part<Bill>;
    statements: Part<StatementRow[]>;
    other: Part<{ id: string; description: string; quantity: number; unit: string; unitPrice: number; recurring: boolean }[]>;
    dashttp: DashttpMode;
};

export async function loadRates(): Promise<RatesData> {
    const settings = await getBillingSettings({ fresh: true });
    const [bill, statements] = await Promise.all([part(() => currentBill(), "bill"), part(() => listStatements(24), "statements")]);
    const other = bill.ok ? await part(() => loadOtherLines(bill.data.period.start), "other") : { ok: false as const };
    return { settings, bill, statements, other, dashttp: dashttpMode() };
}

// ── AI settings rows (Agents, WhatsApp, Switches) ───────────────────────

export async function loadAiValues(): Promise<Record<string, unknown>> {
    const { data, error } = await db.from("ai_settings").select("key, value");
    if (error) throw error;
    return Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));
}

export type AgentsData = { ai: Part<Record<string, unknown>>; settings: BillingSettings };
export async function loadAgents(): Promise<AgentsData> {
    const [ai, settings] = await Promise.all([part(loadAiValues, "ai"), getBillingSettings({ fresh: true })]);
    return { ai, settings };
}

// ── Messages ────────────────────────────────────────────────────────────

export type MessageRow = { id: string; channel: string; recipient: string; event: string | null; status: string; error_code: string | null; created_at: string; order_id: string | null; body: string | null; canResend: boolean };

/** Mask all but the last 3 digits of a phone and the domain of an email. */
export function maskRecipient(r: string): string {
    const s = String(r ?? "");
    if (s.includes("@")) { const [u, d] = s.split("@"); return `${u.slice(0, 2)}…@${d}`; }
    const digits = s.replace(/\D/g, "");
    return digits.length > 3 ? `•••${digits.slice(-3)}` : s;
}

export async function loadMessages(f: { channel?: string; status?: string }): Promise<{ rows: MessageRow[]; failed7d: Record<string, number> }> {
    let q = db.from("notification_log").select("id, channel, recipient, event, status, error_code, created_at, order_id, body").order("created_at", { ascending: false }).limit(100);
    if (f.channel && ["sms", "email", "whatsapp"].includes(f.channel)) q = q.eq("channel", f.channel);
    if (f.status && ["sent", "failed"].includes(f.status)) q = q.eq("status", f.status);
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const [rows, failed] = await Promise.all([q, db.from("notification_log").select("channel").eq("status", "failed").gte("created_at", since).limit(1000)]);
    if (rows.error) throw rows.error;
    const failed7d: Record<string, number> = {};
    for (const r of failed.data ?? []) failed7d[r.channel] = (failed7d[r.channel] ?? 0) + 1;
    return {
        rows: (rows.data ?? []).map((r: any) => ({
            ...r, recipient: maskRecipient(r.recipient), body: r.channel === "email" ? null : typeof r.body === "string" ? r.body.slice(0, 300) : null,
            canResend: r.channel === "sms" && r.status === "failed" && r.created_at >= since,
        })),
        failed7d,
    };
}

/** Cancelled or unpaid orders that reached Paystack in the last 7 days. */
export async function unpaidCount7d(): Promise<number> {
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const { count, error } = await db.from("orders").select("id", { count: "exact", head: true })
        .in("payment_status", ["cancelled", "pending"]).not("paystack_reference", "is", null).gte("created_at", since);
    if (error) throw error;
    return count ?? 0;
}

// ── Switches ────────────────────────────────────────────────────────────

export async function loadSwitches(): Promise<Record<string, boolean>> {
    const [store, ai, s] = await Promise.all([
        db.from("store_settings").select("*").eq("id", "default").maybeSingle(),
        loadAiValues(),
        getBillingSettings({ fresh: true }),
    ]);
    if (store.error) throw store.error;
    const out: Record<string, boolean> = {};
    for (const d of SWITCHES) {
        const col = d.key.slice(d.key.indexOf(".") + 1);
        out[d.key] = d.store === "store" ? store.data?.[col] === true : d.store === "ai" ? ai[col] === true : s.payoutSplitLive;
    }
    return out;
}

// ── System ──────────────────────────────────────────────────────────────

export type SystemData = {
    errors: Part<{ total: number; byCode: { code: string; label: string; count: number }[]; recent: { code: string; place: string; audience: string; created_at: string }[] }>;
    crons: { path: string; schedule: string; lastRun: { started_at: string; ok: boolean | null; note: string | null } | null }[];
    env: { key: string; set: boolean; what: string }[];
    dashttp: DashttpMode;
};

const ENV_KEYS: [string, string][] = [
    ["PAYSTACK_SECRET_KEY", "Paystack (payments, payouts)"], ["PAYSTACK_SPLIT_CODE", "The site's Paystack split"],
    ["DASHTTP_API_BASE", "Dashttp billing API"], ["DASHTTP_CLIENT_TOKEN", "Dashttp billing API token"], ["DASHTTP_WEBHOOK_SECRET", "Dashttp webhook signature"],
    ["CRON_SECRET", "Scheduled jobs"], ["CHATBOTS_AFRICA_API_KEY", "WhatsApp (Chatbots Africa)"], ["ANTHROPIC_API_KEY", "AI assistants"],
    ["RESEND_API_KEY", "Email"], ["MNOTIFY_API_KEY", "SMS (mNotify)"], ["NEXT_PUBLIC_SITE_URL", "Site address"],
];

export async function loadSystem(): Promise<SystemData> {
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const errors = await part(async () => {
        const { data, error } = await db.from("app_error_events").select("code, place, audience, created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(1000);
        if (error) throw error;
        const counts = new Map<string, number>();
        for (const e of data ?? []) counts.set(e.code, (counts.get(e.code) ?? 0) + 1);
        return {
            total: (data ?? []).length,
            byCode: [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([code, count]) => ({ code, label: errorText(code), count })),
            recent: (data ?? []).slice(0, 30),
        };
    }, "errors");
    const jobs: { path: string; schedule: string }[] = (vercelConfig as { crons?: { path: string; schedule: string }[] }).crons ?? [];
    const runs = new Map<string, { started_at: string; ok: boolean | null; note: string | null }>();
    const { data: rr } = await db.from("cron_runs").select("job, started_at, ok, note").order("started_at", { ascending: false }).limit(200);
    for (const r of rr ?? []) if (!runs.has(r.job)) runs.set(r.job, r);
    return {
        errors,
        crons: jobs.map(j => ({ ...j, lastRun: runs.get(j.path.replace(/^\/api\/cron\//, "")) ?? null })),
        env: ENV_KEYS.map(([key, what]) => ({ key, what, set: !!process.env[key] })),
        dashttp: dashttpMode(),
    };
}

export { ERROR_CODES };

// ── Devices and refunds ─────────────────────────────────────────────────

export type DeviceRow = { id: string; created_at: string; host: string; name: string; role: string; current: boolean };

export async function loadDevices(): Promise<DeviceRow[]> {
    const { data, error } = await db.from("admin_push_subscriptions").select("id, user_id, endpoint, created_at").order("created_at", { ascending: false }).limit(200);
    if (error) throw error;
    const ids = [...new Set((data ?? []).map((d: any) => d.user_id).filter(Boolean))];
    const { data: people } = ids.length ? await db.from("profiles").select("id, full_name, email, role").in("id", ids) : { data: [] };
    const by = new Map((people ?? []).map((p: any) => [p.id, p]));
    return (data ?? []).map((d: any) => {
        const p: any = by.get(d.user_id);
        let host = "";
        try { host = new URL(d.endpoint).host; } catch { host = "unknown"; }
        const role = String(p?.role ?? "unknown");
        return { id: d.id, created_at: d.created_at, host, name: p?.full_name || p?.email || "Someone removed", role, current: ["owner", "admin", "sales_staff"].includes(role) };
    });
}

export type RefundRow = { id: string; order_id: string; order_ref: string; amount_ghs: number; method: string; status: string; failure: string | null; reason: string | null; created_at: string };

export async function loadRefunds(): Promise<RefundRow[]> {
    const { data, error } = await db.from("refunds").select("id, order_id, amount_ghs, method, status, failure, reason, created_at").order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    const ids = [...new Set((data ?? []).map((r: any) => r.order_id))];
    const { data: orders } = ids.length ? await db.from("orders").select("id, ref").in("id", ids) : { data: [] };
    const refs = new Map((orders ?? []).map((o: any) => [o.id, o.ref]));
    return (data ?? []).map((r: any) => ({ ...r, amount_ghs: Number(r.amount_ghs) || 0, order_ref: String(refs.get(r.order_id) ?? String(r.order_id).slice(0, 8).toUpperCase()) }));
}
