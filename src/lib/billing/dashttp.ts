// The Dashttp client API: the developer's billing system, which holds the
// maintenance plan (on Dashttp's own Paystack account), issues invoices and
// receipts, and takes payment for the features bill. Server-only.
//
// Contract: /api/client/v1 on DASHTTP_API_BASE, Authorization: Bearer
// DASHTTP_CLIENT_TOKEN, money in GHS to 2 dp, ISO dates. Never Dashttp's
// Paystack key here.
//
// Modes:
//   off   DASHTTP_API_BASE or DASHTTP_CLIENT_TOKEN missing: every call says
//         "not connected" and the pages show a calm notice.
//   mock  DASHTTP_MOCK=1, and never on Vercel: answers from the in-repo
//         fixture (dashttpMock.ts) for local work and tests. Pages label it.
//   live  everything else.
import { mockDashttp } from "./dashttpMock";

export type PlanStatus = "active" | "non_renewing" | "attention" | "cancelled";
export type DashttpInvoiceLine = { service: string; description: string; quantity: number; unit: string; amountGhs: number };
export type DashttpInvoice = {
    id: string; number: string; periodStart: string | null; periodEnd: string | null; issuedAt: string | null; dueAt: string | null;
    amountGhs: number; status: "open" | "paid" | "void"; lines: DashttpInvoiceLine[]; payUrl?: string | null; pdfUrl?: string | null;
};
export type DashttpReceipt = { id: string; number: string; paidAt: string | null; amountGhs: number; description: string; channel: string; pdfUrl: string | null };
export type DashttpBilling = {
    client: { id: string; name: string };
    plan: {
        name: string; amount: number; currency: string; interval: string; status: PlanStatus;
        nextPaymentDate: string | null; autoRenew: boolean; paymentMethod: { type: "card" | "mobile_money"; label: string } | null;
    };
    openInvoices: DashttpInvoice[];
    recentReceipts: DashttpReceipt[];
};

export type DashttpMode = "off" | "mock" | "live";
export type DResult<T> = { ok: true; data: T } | { ok: false; reason: "not_connected" | "unavailable" | "refused" };

export type DashttpDeps = { fetchImpl?: typeof fetch; env?: Record<string, string | undefined> };

export function dashttpMode(env: Record<string, string | undefined> = process.env): DashttpMode {
    if (env.DASHTTP_MOCK === "1" && !env.VERCEL) return "mock";
    if (!env.DASHTTP_API_BASE || !env.DASHTTP_CLIENT_TOKEN) return "off";
    return "live";
}

const TIMEOUT_MS = 8_000;
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Math.round(Number(v) * 100) / 100 : 0);
const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const strOrNull = (v: unknown) => (typeof v === "string" && v ? v : null);

export function parseInvoice(x: any): DashttpInvoice {
    const st = x?.status === "paid" || x?.status === "void" ? x.status : "open";
    return {
        id: str(x?.id), number: str(x?.number), periodStart: strOrNull(x?.periodStart), periodEnd: strOrNull(x?.periodEnd),
        issuedAt: strOrNull(x?.issuedAt), dueAt: strOrNull(x?.dueAt), amountGhs: num(x?.amountGhs), status: st,
        lines: (Array.isArray(x?.lines) ? x.lines : []).map((l: any) => ({ service: str(l?.service), description: str(l?.description), quantity: Number(l?.quantity) || 0, unit: str(l?.unit), amountGhs: num(l?.amountGhs) })),
        payUrl: strOrNull(x?.payUrl), pdfUrl: strOrNull(x?.pdfUrl),
    };
}

export function parseReceipt(x: any): DashttpReceipt {
    return { id: str(x?.id), number: str(x?.number), paidAt: strOrNull(x?.paidAt), amountGhs: num(x?.amountGhs), description: str(x?.description), channel: str(x?.channel), pdfUrl: strOrNull(x?.pdfUrl) };
}

export function parseBilling(x: any): DashttpBilling {
    const p = x?.plan ?? {};
    const status: PlanStatus = ["active", "non_renewing", "attention", "cancelled"].includes(p.status) ? p.status : "attention";
    const pm = p.paymentMethod && typeof p.paymentMethod === "object"
        ? { type: p.paymentMethod.type === "mobile_money" ? "mobile_money" as const : "card" as const, label: str(p.paymentMethod.label) } : null;
    return {
        client: { id: str(x?.client?.id), name: str(x?.client?.name) },
        plan: { name: str(p.name), amount: num(p.amount), currency: str(p.currency) || "GHS", interval: str(p.interval), status, nextPaymentDate: strOrNull(p.nextPaymentDate), autoRenew: p.autoRenew === true, paymentMethod: pm },
        openInvoices: (Array.isArray(x?.openInvoices) ? x.openInvoices : []).map(parseInvoice),
        recentReceipts: (Array.isArray(x?.recentReceipts) ? x.recentReceipts : []).map(parseReceipt),
    };
}

async function call<T>(method: "GET" | "POST", path: string, parse: (x: any) => T, opts: { body?: unknown; idempotencyKey?: string } = {}, d: DashttpDeps = {}): Promise<DResult<T>> {
    const env = d.env ?? process.env;
    const mode = dashttpMode(env);
    if (mode === "off") return { ok: false, reason: "not_connected" };
    if (mode === "mock") {
        const r = mockDashttp(method, path, opts.body);
        return r === null ? { ok: false, reason: "refused" } : { ok: true, data: parse(r) };
    }
    const base = String(env.DASHTTP_API_BASE).replace(/\/+$/, "");
    try {
        const res = await (d.fetchImpl ?? fetch)(`${base}/api/client/v1${path}`, {
            method,
            headers: {
                Authorization: `Bearer ${env.DASHTTP_CLIENT_TOKEN}`, Accept: "application/json",
                ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
                ...(opts.idempotencyKey ? { "Idempotency-Key": opts.idempotencyKey } : {}),
            },
            body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
            signal: AbortSignal.timeout(TIMEOUT_MS),
            cache: "no-store",
        });
        if (res.status >= 500 || res.status === 429 || res.status === 408) return { ok: false, reason: "unavailable" };
        if (res.status === 401 || res.status === 403) { console.error("[dashttp] token refused", { status: res.status, path }); return { ok: false, reason: "not_connected" }; }
        const json = await res.json().catch(() => null);
        if (!res.ok || json == null) { console.error("[dashttp] refused", { status: res.status, path }); return { ok: false, reason: "refused" }; }
        return { ok: true, data: parse(json) };
    } catch (e) {
        console.error("[dashttp] unreachable", { path, error: String((e as Error)?.name ?? e) });
        return { ok: false, reason: "unavailable" };
    }
}

export const getDashttpBilling = (d?: DashttpDeps) => call("GET", "/billing", parseBilling, {}, d);

export const getManageLink = (d?: DashttpDeps) =>
    call("POST", "/billing/manage-link", (x: any) => ({ url: str(x?.url), expiresAt: strOrNull(x?.expiresAt) }), { body: {} }, d);

/** Send a frozen statement. Client-facing amounts only. */
export const submitUsageInvoice = (s: { periodStart: string; periodEnd: string; lines: DashttpInvoiceLine[]; totalGhs: number }, key: string, d?: DashttpDeps) =>
    call("POST", "/usage-invoices", parseInvoice, { body: { periodStart: s.periodStart, periodEnd: s.periodEnd, lines: s.lines, totalGhs: s.totalGhs, currency: "GHS" }, idempotencyKey: key }, d);

export const listUsageInvoices = (status?: "open" | "paid", limit = 20, d?: DashttpDeps) =>
    call("GET", `/usage-invoices?limit=${limit}${status ? `&status=${status}` : ""}`, (x: any) => (Array.isArray(x) ? x : Array.isArray(x?.data) ? x.data : []).map(parseInvoice), {}, d);

export const getUsageInvoice = (id: string, d?: DashttpDeps) => call("GET", `/usage-invoices/${encodeURIComponent(id)}`, parseInvoice, {}, d);

export const payUsageInvoice = (id: string, callbackUrl: string, d?: DashttpDeps) =>
    call("POST", `/usage-invoices/${encodeURIComponent(id)}/pay`, (x: any) => ({ authorizationUrl: str(x?.authorizationUrl), reference: str(x?.reference) }), { body: { callbackUrl } }, d);

export const listReceipts = (limit = 20, d?: DashttpDeps) =>
    call("GET", `/receipts?limit=${limit}`, (x: any) => (Array.isArray(x) ? x : Array.isArray(x?.data) ? x.data : []).map(parseReceipt), {}, d);

/** Only Paystack's own hosted pages may be opened from a Dashttp reply. */
export function safePaystackUrl(u: string): string | null {
    try {
        const url = new URL(u);
        return url.protocol === "https:" && (/(^|\.)paystack\.(com|co)$/.test(url.hostname)) ? url.toString() : null;
    } catch { return null; }
}
