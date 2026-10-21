// Paystack API for Admin Tools and Billing: reading the split and
// settlements, listing banks, checking an account, and creating or updating
// the admin payout subaccount. Server-only. The secret key never leaves this
// module and is never logged; Paystack's own messages go to the log, never
// to the screen. `fetchImpl` is injectable so tests never call Paystack.
//
// Real response shapes (GlowBook, read off live data 2026-09-24): settlement
// amounts are `total_amount`, dates `settlement_date`, and `subaccount` is an
// object present only on subaccount settlements. `?subaccount=` filters on
// /settlement and /transaction silently return nothing, so rows are fetched
// unfiltered and matched here.

const BASE = "https://api.paystack.co";
const TIMEOUT_MS = 10_000;

export type PaystackDeps = { fetchImpl?: typeof fetch; secret?: string | null };
export type PsResult<T> = { ok: true; data: T } | { ok: false; reason: "not_configured" | "unavailable" | "refused"; message?: string };

function secretOf(d: PaystackDeps): string | null {
    return (d.secret !== undefined ? d.secret : process.env.PAYSTACK_SECRET_KEY) || null;
}

async function call<T>(path: string, init: RequestInit & { parse: (data: any) => T }, d: PaystackDeps = {}): Promise<PsResult<T>> {
    const secret = secretOf(d);
    if (!secret) return { ok: false, reason: "not_configured" };
    const doFetch = d.fetchImpl ?? fetch;
    try {
        const res = await doFetch(`${BASE}${path}`, {
            ...init,
            headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
            signal: AbortSignal.timeout(TIMEOUT_MS),
            cache: "no-store",
        });
        const json = await res.json().catch(() => null);
        if (res.status >= 500 || res.status === 429) return { ok: false, reason: "unavailable" };
        if (!res.ok || !json?.status) {
            const message = typeof json?.message === "string" ? json.message.slice(0, 200) : undefined;
            console.error("[paystack]", init.method ?? "GET", path.split("?")[0], res.status, message ?? "");
            return { ok: false, reason: "refused", message };
        }
        return { ok: true, data: init.parse(json.data) };
    } catch (e) {
        console.error("[paystack] unreachable", path.split("?")[0], String((e as Error)?.name ?? e));
        return { ok: false, reason: "unavailable" };
    }
}

/** A number off Paystack however they sent it (numbers and numeric strings both occur). */
export function pesewas(v: unknown): number | null {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
    return null;
}

const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

/** "•••• 4821": the last four only. */
export function maskAccount(n: unknown): string {
    const s = str(n).replace(/\s+/g, "");
    return s ? `•••• ${s.slice(-4)}` : "";
}

// ── Splits ───────────────────────────────────────────────────────────────

export type SplitShare = { subaccountCode: string; businessName: string; bank: string; account: string; accountName: string; share: number };
export type Split = {
    /** Paystack's numeric id: what PUT /split/:id takes. */
    id: string;
    code: string; name: string; type: string; bearerType: string; active: boolean; createdAt: string | null;
    shares: SplitShare[];
};

function parseSplit(d: any): Split {
    return {
        id: str(d?.id), code: str(d?.split_code), name: str(d?.name), type: str(d?.type), bearerType: str(d?.bearer_type),
        active: d?.active === true || d?.active === 1, createdAt: d?.createdAt ? str(d.createdAt) : null,
        shares: (Array.isArray(d?.subaccounts) ? d.subaccounts : []).map((s: any) => ({
            subaccountCode: str(s?.subaccount?.subaccount_code), businessName: str(s?.subaccount?.business_name),
            bank: str(s?.subaccount?.settlement_bank), account: maskAccount(s?.subaccount?.account_number),
            accountName: str(s?.subaccount?.account_name), share: Number(s?.share) || 0,
        })),
    };
}

export const getSplit = (code: string, d?: PaystackDeps) =>
    call(`/split/${encodeURIComponent(code)}`, { method: "GET", parse: parseSplit }, d);

/** Turn a split group off or back on. Never deletes it. */
export const setSplitActive = (id: string, active: boolean, d?: PaystackDeps) =>
    call(`/split/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify({ active }), parse: parseSplit }, d);

/** One transaction by reference, raw (server-side only: it carries the card authorization). */
export const verifyTransactionRaw = (reference: string, d?: PaystackDeps) =>
    call(`/transaction/verify/${encodeURIComponent(reference)}`, { method: "GET", parse: (x: any) => (x && typeof x === "object" ? x as Record<string, unknown> : {}) }, d);

export const listSplits = (d?: PaystackDeps) =>
    call(`/split?perPage=50`, { method: "GET", parse: (x: any) => (Array.isArray(x) ? x.map(parseSplit) : []) }, d);

// ── Banks, accounts and subaccounts ─────────────────────────────────────

export type Bank = { name: string; code: string; type: "mobile_money" | "ghipss" };

/** Ghana payout destinations: one call per type. Mobile money first. */
export async function listGhanaBanks(d?: PaystackDeps): Promise<PsResult<{ mobileMoney: Bank[]; banks: Bank[] }>> {
    const one = (type: Bank["type"]) => call(`/bank?country=ghana&currency=GHS&type=${type}&perPage=100`, {
        method: "GET",
        parse: (x: any) => (Array.isArray(x) ? x : []).filter((b: any) => b?.active !== false && b?.code)
            .map((b: any) => ({ name: str(b.name), code: str(b.code), type })),
    }, d);
    const [m, b] = await Promise.all([one("mobile_money"), one("ghipss")]);
    if (!m.ok && !b.ok) return m;
    return { ok: true, data: { mobileMoney: m.ok ? m.data : [], banks: b.ok ? b.data : [] } };
}

export const resolveAccount = (accountNumber: string, bankCode: string, d?: PaystackDeps) =>
    call(`/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`, {
        method: "GET", parse: (x: any) => ({ accountNumber: str(x?.account_number), accountName: str(x?.account_name) }),
    }, d);

export type Subaccount = { code: string; businessName: string; bank: string; account: string; accountName: string; active: boolean };
const parseSub = (x: any): Subaccount => ({
    code: str(x?.subaccount_code), businessName: str(x?.business_name), bank: str(x?.settlement_bank),
    account: maskAccount(x?.account_number), accountName: str(x?.account_name), active: x?.active !== false,
});

export const fetchSubaccount = (code: string, d?: PaystackDeps) =>
    call(`/subaccount/${encodeURIComponent(code)}`, { method: "GET", parse: parseSub }, d);

/**
 * Create the admin payout subaccount. percentage_charge 0: every payment
 * names the exact amount (transaction_charge), so a percentage on the
 * subaccount itself would be wrong.
 */
export const createSubaccount = (p: { businessName: string; bankCode: string; accountNumber: string; email?: string }, d?: PaystackDeps) =>
    call(`/subaccount`, {
        method: "POST",
        body: JSON.stringify({
            business_name: p.businessName, settlement_bank: p.bankCode, account_number: p.accountNumber,
            percentage_charge: 0, description: "Miss Tokyo admin payout account",
            ...(p.email ? { primary_contact_email: p.email } : {}),
        }),
        parse: parseSub,
    }, d);

export const updateSubaccount = (code: string, p: { businessName: string; bankCode: string; accountNumber: string }, d?: PaystackDeps) =>
    call(`/subaccount/${encodeURIComponent(code)}`, {
        method: "PUT",
        body: JSON.stringify({ business_name: p.businessName, settlement_bank: p.bankCode, account_number: p.accountNumber }),
        parse: parseSub,
    }, d);

// ── Settlements and balance ─────────────────────────────────────────────

export type Settlement = { id: string; status: string; amountGhs: number; feesGhs: number | null; settledAt: string | null; subaccountCode: string | null };

function parseSettlements(x: any): Settlement[] {
    return (Array.isArray(x) ? x : []).map((row: any): Settlement | null => {
        const amount = pesewas(row?.total_amount) ?? pesewas(row?.effective_amount);
        if (amount === null) return null;
        const sub = row?.subaccount && typeof row.subaccount === "object" ? str(row.subaccount.subaccount_code) || null : null;
        const fees = pesewas(row?.total_fees);
        return {
            id: str(row?.id), status: str(row?.status) || "unknown", amountGhs: amount / 100, feesGhs: fees === null ? null : fees / 100,
            settledAt: row?.settlement_date ? str(row.settlement_date) : row?.updatedAt ? str(row.updatedAt) : null, subaccountCode: sub,
        };
    }).filter((r): r is Settlement => r !== null);
}

export const listSettlements = (perPage = 50, d?: PaystackDeps) =>
    call(`/settlement?perPage=${perPage}`, { method: "GET", parse: parseSettlements }, d);

export type SettlementTx = { reference: string; amountGhs: number; paidAt: string | null; channel: string | null; subaccountShareGhs: number | null };

export const settlementTransactions = (id: string, subaccountCode: string | null, d?: PaystackDeps) =>
    call(`/settlement/${encodeURIComponent(id)}/transactions?perPage=100`, {
        method: "GET",
        parse: (x: any): SettlementTx[] => (Array.isArray(x) ? x : []).map((t: any) => {
            const share = subaccountCode ? subaccountShareOf(t, subaccountCode) : null;
            return {
                reference: str(t?.reference), amountGhs: (pesewas(t?.amount) ?? 0) / 100,
                paidAt: t?.paid_at ? str(t.paid_at) : t?.paidAt ? str(t.paidAt) : null, channel: t?.channel ? str(t.channel) : null,
                subaccountShareGhs: share === null ? null : share / 100,
            };
        }),
    }, d);

export const getBalance = (d?: PaystackDeps) =>
    call(`/balance`, { method: "GET", parse: (x: any) => (Array.isArray(x) ? x : []).map((b: any) => ({ currency: str(b?.currency), balanceGhs: (pesewas(b?.balance) ?? 0) / 100 })) }, d);

// ── What a transaction paid one subaccount ──────────────────────────────

function maybeJson(v: unknown): unknown {
    if (typeof v !== "string") return v;
    try { return JSON.parse(v); } catch { return null; }
}

/**
 * Pesewas one subaccount earned from a transaction, whichever way it was
 * split. A split group (split_code, also dynamic splits) reports in
 * split.shares.subaccounts[]; a single-subaccount charge (subaccount +
 * transaction_charge) reports in fees_split, often as a JSON string, and
 * names its owner only in `subaccount`. Null when this subaccount got nothing.
 */
export function subaccountShareOf(row: unknown, subaccountCode: string): number | null {
    if (!row || typeof row !== "object") return null;
    const r = row as Record<string, unknown>;
    const split = maybeJson(r.split) as Record<string, unknown> | null;
    const shares = split && typeof split === "object" ? maybeJson(split.shares) as Record<string, unknown> | null : null;
    const subs = shares && typeof shares === "object" ? shares.subaccounts : null;
    if (Array.isArray(subs)) {
        const mine = subs.filter((e: any) => e && typeof e === "object" && e.subaccount_code === subaccountCode);
        if (mine.length) return mine.reduce((s: number, e: any) => s + (pesewas(e.amount) ?? 0), 0);
    }
    const fees = maybeJson(r.fees_split) as Record<string, unknown> | null;
    if (fees && typeof fees === "object") {
        const sub = r.subaccount as Record<string, unknown> | null;
        const owner = sub && typeof sub === "object" ? sub.subaccount_code : undefined;
        if (owner === subaccountCode) return pesewas(fees.subaccount);
    }
    return null;
}
