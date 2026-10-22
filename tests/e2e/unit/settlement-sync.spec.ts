import "./stubSupabaseEnv";
import { test, expect } from "@playwright/test";
import { listSettlementsPage, settlementTransactions, type Settlement, type SettlementTx } from "../../../src/lib/paystack/api";
import { settlementRow, snapshotRow, sourceOf, syncPaystackSettlements, txRow, type SyncDeps } from "../../../src/lib/billing/settlementSync";
import { BILLING_DEFAULTS } from "../../../src/lib/billing/settings";

const NOW = new Date("2026-10-22T12:00:00.000Z");
const ADMIN = "ACCT_admin";

const adminSettlement: Settlement = { id: "9001", status: "success", amountGhs: 3.43, feesGhs: 0, settledAt: "2026-10-21T00:00:00.000Z", subaccountCode: ADMIN };
const mainSettlement: Settlement = { id: "9002", status: "success", amountGhs: 120, feesGhs: 2.4, settledAt: "2026-10-21T00:00:00.000Z", subaccountCode: null };

test("settlementRow: admin subaccount settlement is flagged and net equals gross with no fees", () => {
    const raw = { id: 9001, total_amount: 343, total_fees: 0, subaccount: { subaccount_code: ADMIN } };
    const r = settlementRow(adminSettlement, raw, [ADMIN], NOW);
    expect(r).toMatchObject({ id: "9001", net_ghs: 3.43, gross_ghs: 3.43, fees_ghs: 0, is_admin: true, subaccount_code: ADMIN, status: "success", raw });
    expect(r.synced_at).toBe(NOW.toISOString());
});

test("settlementRow: main-account settlement is not admin, gross adds the fees back", () => {
    const r = settlementRow(mainSettlement, {}, [ADMIN], NOW);
    expect(r).toMatchObject({ is_admin: false, net_ghs: 120, gross_ghs: 122.4, fees_ghs: 2.4, subaccount_code: null });
    const noFees = settlementRow({ ...mainSettlement, feesGhs: null }, {}, [ADMIN], NOW);
    expect(noFees).toMatchObject({ gross_ghs: 120, fees_ghs: null });
});

const tx: SettlementTx = { reference: "Ref-AbC_1", amountGhs: 137.5, paidAt: "2026-10-20T10:00:00.000Z", channel: "card", subaccountShareGhs: 3.44, feesGhs: 2.74, raw: { reference: "Ref-AbC_1" } };

test("txRow: no order is 'other' and the reference is kept as it is", () => {
    const r = txRow("9001", tx, null);
    expect(r).toMatchObject({ settlement_id: "9001", reference: "Ref-AbC_1", order_id: null, source: "other", amount_ghs: 137.5, admin_share_ghs: 3.44, paystack_cut_ghs: 2.74, paid_at: tx.paidAt, raw: tx.raw });
});

test("txRow: order source maps through sourceOf", () => {
    expect(txRow("9001", tx, { id: "o1", source: "pos" })).toMatchObject({ source: "pos", order_id: "o1" });
    expect(txRow("9001", tx, { id: "o2", source: "storefront" })).toMatchObject({ source: "checkout", order_id: "o2" });
    expect(txRow("9001", tx, { id: "o3", source: "whatsapp" }).source).toBe("invoice");
    expect(txRow("9001", tx, { id: "o4", source: "mystery" }).source).toBe("other");
    expect(sourceOf(null)).toBe("other");
    expect(sourceOf("")).toBe("other");
});

test("snapshotRow: total from the bill, base from priced lines only", () => {
    const line = (service: string, baseGhs: number, amountGhs: number, priced: boolean) => ({ service, key: service, description: service, quantity: 1, unit: "x", unitRate: priced ? 1 : null, costGhs: null, baseGhs, amountGhs, priced, perUnit: true });
    const bill: any = {
        period: { start: "2026-10-01", end: "2026-10-31", fromIso: "2026-10-01T00:00:00.000Z", toIso: "2026-11-01T00:00:00.000Z" },
        usage: { aiReplies: 3 },
        priced: [line("ai", 19.7, 29.55, true), line("sms", 10, 15, true), line("whatsapp", 99, 99, false)],
        totalGhs: 44.55,
    };
    const s = { ...BILLING_DEFAULTS };
    const r = snapshotRow(bill, s, NOW);
    expect(r).toMatchObject({ period_start: "2026-10-01", period_end: "2026-10-31", total_ghs: 44.55, base_ghs: 29.7, computed_at: NOW.toISOString() });
    expect(r.internal).toMatchObject({ usage: bill.usage, markupPct: s.markupPct, priced: bill.priced, visibility: s.ownerVisibility });
    expect(Object.keys(r.internal as object).sort()).toEqual(["markupPct", "priced", "rates", "usage", "visibility"]);
});

function fakeFetch(body: unknown) {
    const urls: string[] = [];
    const impl = (async (url: string) => { urls.push(url); return new Response(JSON.stringify(body), { status: 200 }); }) as unknown as typeof fetch;
    return { impl, urls };
}

test("listSettlementsPage: pages, keeps raw rows, reports pageCount; from is passed on", async () => {
    const rows = [{ id: 1, total_amount: 343, total_fees: 0, status: "success", settlement_date: "2026-10-21", subaccount: { subaccount_code: ADMIN } }];
    const f = fakeFetch({ status: true, data: rows, meta: { page: 2, pageCount: 5, perPage: 50 } });
    const r = await listSettlementsPage(2, 50, "2026-10-01", { fetchImpl: f.impl, secret: "sk_test" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.pageCount).toBe(5);
    expect(r.data.raw).toEqual(rows);
    expect(r.data.rows[0]).toMatchObject({ id: "1", amountGhs: 3.43, subaccountCode: ADMIN });
    expect(f.urls[0]).toContain("/settlement?");
    expect(f.urls[0]).toContain("page=2");
    expect(f.urls[0]).toContain("perPage=50");
    expect(f.urls[0]).toContain("from=2026-10-01");
});

test("listSettlementsPage: a row we cannot read is dropped from rows and raw together", async () => {
    const good = (id: number) => ({ id, total_amount: 100 * id, total_fees: 0, status: "success", settlement_date: "2026-10-21" });
    const bad = { id: 2, status: "success" };
    const f = fakeFetch({ status: true, data: [good(1), bad, good(3)], meta: { pageCount: 1 } });
    const r = await listSettlementsPage(1, 50, undefined, { fetchImpl: f.impl, secret: "sk_test" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.rows.map(x => x.id)).toEqual(["1", "3"]);
    expect(r.data.raw).toHaveLength(r.data.rows.length);
    r.data.rows.forEach((row, i) => expect(String((r.data.raw[i] as any).id)).toBe(row.id));
});

test("settlementTransactions now carries raw and fees", async () => {
    const t = { reference: "r1", amount: 13750, fees: 274, paid_at: "2026-10-20T10:00:00.000Z", channel: "card" };
    const f = fakeFetch({ status: true, data: [t] });
    const r = await settlementTransactions("9001", null, { fetchImpl: f.impl, secret: "sk_test" });
    expect(r.ok && r.data[0]).toMatchObject({ reference: "r1", amountGhs: 137.5, feesGhs: 2.74, raw: t });
});

// ── syncPaystackSettlements, with fakes ──────────────────────────────────

const DAY = 86_400_000;
const sett = (id: string, over: Partial<Settlement> = {}): Settlement => ({ id, status: "success", amountGhs: 10, feesGhs: 0, settledAt: "2026-10-21T00:00:00.000Z", subaccountCode: ADMIN, ...over });
const stx = (reference: string): SettlementTx => ({ reference, amountGhs: 50, paidAt: "2026-10-20T10:00:00.000Z", channel: "card", subaccountShareGhs: 1.25, feesGhs: 0.9, raw: { reference } });

const BILL: any = {
    period: { start: "2026-10-01", end: "2026-10-31", fromIso: "2026-10-01T00:00:00.000Z", toIso: "2026-11-01T00:00:00.000Z" },
    usage: {}, priced: [], totalGhs: 12,
};

function harness(opts: {
    pages?: Settlement[][]; txs?: Record<string, SettlementTx[]>; enabled?: boolean | Error; orders?: any[];
    store?: { settlements?: any[]; txs?: any[] }; pageError?: boolean; txPages?: Record<string, SettlementTx[][]>;
    adminCodes?: string[] | Error;
} = {}) {
    const pages = opts.pages ?? [[sett("9001"), sett("9002", { subaccountCode: null })], [sett("9003", { settledAt: "2026-10-10T00:00:00.000Z" })]];
    const txs = opts.txs ?? { "9001": [stx("r1"), stx("r2")], "9003": [stx("r3"), stx("r4")] };
    const settlements = new Map<string, any>((opts.store?.settlements ?? []).map(r => [r.id, r]));
    const txStore = new Map<string, any>((opts.store?.txs ?? []).map(r => [`${r.settlement_id}|${r.reference}`, r]));
    const snapshots = new Map<string, any>();
    const calls = { listPage: [] as any[], txPage: [] as any[], orders: [] as string[][] };
    const deps: SyncDeps = {
        enabled: async () => { if (opts.enabled instanceof Error) throw opts.enabled; return opts.enabled ?? true; },
        adminCodes: async () => { if (opts.adminCodes instanceof Error) throw opts.adminCodes; return opts.adminCodes ?? [ADMIN]; },
        listPage: async (page, perPage, from) => {
            calls.listPage.push({ page, perPage, from });
            if (opts.pageError) return { ok: false, reason: "unavailable" };
            const rows = pages[page - 1] ?? [];
            return { ok: true, data: { rows, raw: rows.map(r => ({ id: r.id })), pageCount: pages.length } };
        },
        txPage: async (id, sub, page) => {
            calls.txPage.push({ id, sub, page });
            if (opts.txPages) return { ok: true, data: opts.txPages[id]?.[page - 1] ?? [] };
            return { ok: true, data: page === 1 ? txs[id] ?? [] : [] };
        },
        currentBill: async () => ({ bill: BILL, settings: { ...BILLING_DEFAULTS } }),
        maxSettledAt: async () => [...settlements.values()].map(r => r.settled_at).filter(Boolean).sort().pop() ?? null,
        oldestOpenSettledAt: async () => [...settlements.values()].filter(r => r.settled_at && !["success", "paid"].includes(r.status)).map(r => r.settled_at).sort()[0] ?? null,
        savedAdminIds: async ids => ids.filter(id => settlements.get(id)?.is_admin === true),
        upsertSettlements: async rows => { for (const r of rows) settlements.set(r.id, { ...settlements.get(r.id), ...r }); },
        settlementsNeedingTxs: async recentIso => [...settlements.values()]
            .filter(r => r.is_admin && (!r.txs_synced_at || (r.settled_at && r.settled_at >= recentIso)))
            .map(r => ({ id: r.id, subaccount_code: r.subaccount_code })),
        ordersFor: async refs => { calls.orders.push(refs); return opts.orders ?? []; },
        upsertTxs: async rows => { for (const r of rows) txStore.set(`${r.settlement_id}|${r.reference}`, r); },
        markTxsSynced: async (id, iso) => { settlements.get(id).txs_synced_at = iso; },
        upsertSnapshot: async row => { snapshots.set(row.period_start, row); },
    };
    return { deps, settlements, txStore, snapshots, calls };
}

test("sync: two runs over the same pages leave 3 settlements and 4 txs, not 6 and 8", async () => {
    const h = harness();
    const first = await syncPaystackSettlements(NOW, h.deps);
    expect(first).toEqual({ skipped: false, settlements: 3, txs: 4, snapshot: true, failed: [] });
    await syncPaystackSettlements(new Date(NOW.getTime() + 3_600_000), h.deps);
    expect(h.settlements.size).toBe(3);
    expect(h.txStore.size).toBe(4);
    expect(h.snapshots.size).toBe(1);
    expect(h.settlements.get("9002").is_admin).toBe(false);
    expect(h.calls.txPage.every(c => c.id !== "9002")).toBe(true);
});

test("sync: a settlement returned again as success overwrites its stored pending status", async () => {
    const h = harness({ pages: [[sett("9001", { status: "success" })]], txs: { "9001": [] }, store: { settlements: [{ id: "9001", status: "pending", is_admin: true, settled_at: "2026-10-21T00:00:00.000Z", txs_synced_at: "2026-10-21T01:00:00.000Z" }] } });
    await syncPaystackSettlements(NOW, h.deps);
    expect(h.settlements.get("9001").status).toBe("success");
});

test("sync: disabled gives skipped and makes no Paystack calls", async () => {
    const h = harness({ enabled: false });
    const r = await syncPaystackSettlements(NOW, h.deps);
    expect(r).toMatchObject({ skipped: true, settlements: 0, txs: 0, snapshot: false });
    expect(h.calls.listPage).toHaveLength(0);
    expect(h.calls.txPage).toHaveLength(0);
    expect(h.settlements.size).toBe(0);
});

test("sync: an unreadable switch skips and says 'settings' failed", async () => {
    const h = harness({ enabled: new Error("boom") });
    const r = await syncPaystackSettlements(NOW, h.deps);
    expect(r).toMatchObject({ skipped: true, failed: ["settings"] });
    expect(h.calls.listPage).toHaveLength(0);
});

test("sync: a first run that fails on page 2 saves nothing, so the next run starts with no from", async () => {
    const h = harness({ pages: [[sett("9001")], [sett("9002")]] });
    const realList = h.deps.listPage;
    h.deps.listPage = async (page, perPage, from) => page === 2 ? (h.calls.listPage.push({ page, perPage, from }), { ok: false, reason: "unavailable" } as const) : realList(page, perPage, from);
    const first = await syncPaystackSettlements(NOW, h.deps);
    expect(first.failed).toContain("settlements");
    expect(first.settlements).toBe(0);
    expect(h.settlements.size).toBe(0);
    h.deps.listPage = realList;
    h.calls.listPage.length = 0;
    const second = await syncPaystackSettlements(NOW, h.deps);
    expect(h.calls.listPage[0].from).toBeUndefined();
    expect(second.settlements).toBe(2);
});

test("sync: a pending settlement older than the newest pulls from back to its own date", async () => {
    const h = harness({ pages: [[]], store: { settlements: [
        { id: "new", status: "success", is_admin: false, settled_at: "2026-10-20T00:00:00.000Z" },
        { id: "stale", status: "pending", is_admin: false, settled_at: "2026-10-10T00:00:00.000Z" },
    ] } });
    await syncPaystackSettlements(NOW, h.deps);
    expect(h.calls.listPage[0].from).toBe("2026-10-10");
});

test("sync: an undefined dep does not replace the real one", async () => {
    const h = harness({ enabled: false });
    const r = await syncPaystackSettlements(NOW, { ...h.deps, listPage: undefined });
    expect(r.skipped).toBe(true);
});

test("sync: hitting the transaction page cap says 'transactions' failed and leaves the settlement unmarked", async () => {
    const h = harness({ pages: [[sett("9001")]] });
    h.deps.txPage = async () => ({ ok: true, data: Array.from({ length: 100 }, (_, i) => stx(`c${Math.random()}-${i}`)) });
    const r = await syncPaystackSettlements(NOW, h.deps);
    expect(r.failed).toEqual(["transactions"]);
    expect(h.settlements.get("9001").txs_synced_at).toBeUndefined();
});

test("sync: a Paystack page error says 'settlements' failed and keeps the stored rows", async () => {
    const stored = { id: "9001", status: "success", is_admin: true, settled_at: "2026-10-01T00:00:00.000Z", txs_synced_at: "2026-10-02T00:00:00.000Z" };
    const h = harness({ pageError: true, store: { settlements: [stored] } });
    const r = await syncPaystackSettlements(NOW, h.deps);
    expect(r.failed).toEqual(["settlements"]);
    expect(r.settlements).toBe(0);
    expect(h.settlements.get("9001")).toMatchObject(stored);
});

test("sync: empty store pages from the start; a stored max of 2026-10-20 uses from=2026-10-17", async () => {
    const empty = harness({ pages: [[]] });
    await syncPaystackSettlements(NOW, empty.deps);
    expect(empty.calls.listPage[0].from).toBeUndefined();
    expect(empty.calls.listPage[0].page).toBe(1);

    const stored = harness({ pages: [[]], store: { settlements: [{ id: "9000", is_admin: false, settled_at: "2026-10-20T00:00:00.000Z" }] } });
    await syncPaystackSettlements(NOW, stored.deps);
    expect(stored.calls.listPage[0].from).toBe("2026-10-17");
});

test("sync: transactions are matched to orders by paystack_reference, else ref", async () => {
    const h = harness({
        pages: [[sett("9001")]], txs: { "9001": [stx("PSREF1"), stx("3512F7BD"), stx("NOORDER")] },
        orders: [
            { id: "o1", source: "pos", paystack_reference: "PSREF1", ref: "AAAAAAAA" },
            { id: "o2", source: "storefront", paystack_reference: null, ref: "3512F7BD" },
        ],
    });
    await syncPaystackSettlements(NOW, h.deps);
    expect(h.calls.orders).toHaveLength(1);
    expect(h.txStore.get("9001|PSREF1")).toMatchObject({ order_id: "o1", source: "pos" });
    expect(h.txStore.get("9001|3512F7BD")).toMatchObject({ order_id: "o2", source: "checkout" });
    expect(h.txStore.get("9001|NOORDER")).toMatchObject({ order_id: null, source: "other" });
});

test("sync: a settled-and-synced settlement older than 3 days is not fetched again", async () => {
    const h = harness({
        pages: [[]], store: { settlements: [
            { id: "old", is_admin: true, settled_at: "2026-10-10T00:00:00.000Z", txs_synced_at: "2026-10-11T00:00:00.000Z", subaccount_code: ADMIN },
            { id: "new", is_admin: true, settled_at: new Date(NOW.getTime() - DAY).toISOString(), txs_synced_at: "2026-10-21T13:00:00.000Z", subaccount_code: ADMIN },
        ] }, txs: { new: [stx("n1")], old: [stx("o1")] },
    });
    await syncPaystackSettlements(NOW, h.deps);
    expect(h.calls.txPage.map(c => c.id)).toEqual(["new"]);
});

test("sync: a settlement with 100 transactions on page 1 fetches page 2 until fewer than 100 come back", async () => {
    const many = (a: number, n: number) => Array.from({ length: n }, (_, i) => stx(`t${a + i}`));
    const h = harness({ pages: [[sett("9001")]], txPages: { "9001": [many(0, 100), many(100, 100), many(200, 7)] } });
    const r = await syncPaystackSettlements(NOW, h.deps);
    expect(h.calls.txPage.map(c => c.page)).toEqual([1, 2, 3]);
    expect(r.txs).toBe(207);
    expect(h.txStore.size).toBe(207);
});

test("sync: a failed transaction page leaves the settlement unmarked so the next run retries it", async () => {
    const h = harness({ pages: [[sett("9001")]] });
    h.deps.txPage = async () => ({ ok: false, reason: "unavailable" });
    const r = await syncPaystackSettlements(NOW, h.deps);
    expect(r.failed).toEqual(["transactions"]);
    expect(h.settlements.get("9001").txs_synced_at).toBeUndefined();
    expect(r.snapshot).toBe(true);
});

test("sync: a failed snapshot says 'snapshot' failed and does not throw", async () => {
    const h = harness({ pages: [[]] });
    h.deps.currentBill = async () => { throw new Error("db down"); };
    const r = await syncPaystackSettlements(NOW, h.deps);
    expect(r).toMatchObject({ snapshot: false, failed: ["snapshot"] });
});

test("sync: unreadable admin codes save no settlements, say 'settings' failed, and still sync saved admin settlements", async () => {
    const stored = { id: "old", status: "success", is_admin: true, settled_at: "2026-10-10T00:00:00.000Z", subaccount_code: ADMIN };
    const h = harness({ adminCodes: new Error("split unreadable"), store: { settlements: [stored] }, txs: { old: [stx("o1")] } });
    const r = await syncPaystackSettlements(NOW, h.deps);
    expect(r).toMatchObject({ skipped: false, settlements: 0, txs: 1, snapshot: true, failed: ["settings"] });
    expect(h.calls.listPage).toHaveLength(0);
    expect([...h.settlements.keys()]).toEqual(["old"]);
});

test("sync: a saved admin settlement stays admin when this run's codes no longer include its subaccount", async () => {
    const h = harness({
        adminCodes: ["ACCT_new"], pages: [[sett("9001", { subaccountCode: ADMIN }), sett("9002", { subaccountCode: null })]], txs: { "9001": [] },
        store: { settlements: [
            { id: "9001", status: "success", is_admin: true, subaccount_code: ADMIN, settled_at: "2026-10-21T00:00:00.000Z" },
            { id: "9002", status: "success", is_admin: false, subaccount_code: null, settled_at: "2026-10-21T00:00:00.000Z" },
        ] },
    });
    const r = await syncPaystackSettlements(NOW, h.deps);
    expect(r.failed).toEqual([]);
    expect(h.settlements.get("9001").is_admin).toBe(true);
    expect(h.settlements.get("9002").is_admin).toBe(false);
});

test("sync: a settlement read on two pages is upserted once, the last read winning", async () => {
    const h = harness({ pages: [[sett("9001", { status: "pending" }), sett("9002")], [sett("9001", { status: "success" })]], txs: { "9001": [] } });
    const upserted: string[][] = [];
    const real = h.deps.upsertSettlements;
    h.deps.upsertSettlements = async rows => { upserted.push(rows.map(r => r.id)); return real(rows); };
    const r = await syncPaystackSettlements(NOW, h.deps);
    expect(upserted).toEqual([["9001", "9002"]]);
    expect(r.settlements).toBe(2);
    expect(h.settlements.get("9001").status).toBe("success");
});

test("sync: a failed read of saved admin ids saves no settlements", async () => {
    const h = harness({ pages: [[sett("9001")]] });
    h.deps.savedAdminIds = async () => { throw new Error("db down"); };
    const r = await syncPaystackSettlements(NOW, h.deps);
    expect(r.failed).toContain("settlements");
    expect(r.settlements).toBe(0);
    expect(h.settlements.size).toBe(0);
});

test("adminSubaccountCodesStrict: stored code plus the split's codes; an unreadable split is a failure, not a shorter list", async () => {
    const { adminSubaccountCodesStrict } = await import("../../../src/lib/billing/paystackReports");
    const split = (codes: string[]) => async () => ({ ok: true as const, data: { shares: codes.map(subaccountCode => ({ subaccountCode })) } });
    const both = await adminSubaccountCodesStrict("ACCT_stored", { splitCode: "SPL_x", readSplit: split(["ACCT_env", "ACCT_stored", ""]) });
    expect(both).toEqual({ ok: true, data: ["ACCT_stored", "ACCT_env"] });
    const failed = await adminSubaccountCodesStrict("ACCT_stored", { splitCode: "SPL_x", readSplit: async () => ({ ok: false, reason: "unavailable" }) });
    expect(failed.ok).toBe(false);
    const noSplit = await adminSubaccountCodesStrict("ACCT_stored", { splitCode: null, readSplit: async () => { throw new Error("not called"); } });
    expect(noSplit).toEqual({ ok: true, data: ["ACCT_stored"] });
});

test("settlementTransactions: page 2 is asked for with &page=2, page 1 keeps the old URL", async () => {
    const f = fakeFetch({ status: true, data: [] });
    await settlementTransactions("9001", null, { fetchImpl: f.impl, secret: "sk_test" });
    await settlementTransactions("9001", null, { fetchImpl: f.impl, secret: "sk_test" }, 2);
    expect(f.urls[0]).toMatch(/\/settlement\/9001\/transactions\?perPage=100$/);
    expect(f.urls[1]).toContain("perPage=100&page=2");
});

test("savedSettlementsView: splits admin and main by the admin codes passed in, same shape as the live view", async () => {
    const { savedSettlementsView } = await import("../../../src/lib/billing/paystackReports");
    const rows = [
        { id: "A", status: "success", settled_at: "2026-10-21T00:00:00.000Z", fees_ghs: 0, net_ghs: 3.43, subaccount_code: ADMIN },
        { id: "B", status: "success", settled_at: "2026-10-20T00:00:00.000Z", fees_ghs: 2.4, net_ghs: 120, subaccount_code: null },
        { id: "C", status: "success", settled_at: "2026-10-19T00:00:00.000Z", fees_ghs: null, net_ghs: 9, subaccount_code: "ACCT_other" },
    ];
    const v = await savedSettlementsView([ADMIN], async () => ({ rows, syncedAt: "2026-10-22T11:00:00.000Z" }));
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(v.admin).toEqual([{ id: "A", status: "success", amountGhs: 3.43, feesGhs: 0, settledAt: "2026-10-21T00:00:00.000Z", subaccountCode: ADMIN }]);
    expect(v.main.map(s => s.id)).toEqual(["B"]);
    expect(v.main[0]).toMatchObject({ amountGhs: 120, feesGhs: 2.4, subaccountCode: null });
    expect(v.syncedAt).toBe("2026-10-22T11:00:00.000Z");
});

test("savedSettlementsView: a failed read is a calm 'unavailable'", async () => {
    const { savedSettlementsView } = await import("../../../src/lib/billing/paystackReports");
    const v = await savedSettlementsView([ADMIN], async () => { throw new Error("db down"); });
    expect(v).toMatchObject({ ok: false, reason: "unavailable", syncedAt: null });
});

/** A fake table that honours select(cols), order(col, {ascending, nullsFirst}) and limit(n) over real rows. */
function fakeTable(rows: Record<string, any>[]) {
    return {
        from(_table: string) {
            let cols: string[] = [];
            let ord: { col: string; asc: boolean } | null = null;
            const q: any = {
                select(c: string) { cols = c.split(",").map(x => x.trim()); return q; },
                order(col: string, o: { ascending?: boolean } = {}) { ord = { col, asc: o.ascending !== false }; return q; },
                limit(n: number) {
                    let out = [...rows];
                    if (ord) out.sort((a, b) => (ord!.asc ? 1 : -1) * String(a[ord!.col] ?? "").localeCompare(String(b[ord!.col] ?? "")));
                    return Promise.resolve({ data: out.slice(0, n).map(r => Object.fromEntries(cols.map(c => [c, r[c]]))), error: null });
                },
            };
            return q;
        },
    };
}

test("savedReader: syncedAt is the newest synced_at in the table (not the newest-settled row, not the oldest)", async () => {
    const { savedReader } = await import("../../../src/lib/billing/paystackReports");
    const row = (id: string, settled_at: string, synced_at: string) => ({ id, status: "success", settled_at, fees_ghs: "0", net_ghs: "3.43", subaccount_code: ADMIN, synced_at });
    // The newest-settled row (A) was synced EARLIER than an older settlement (C) that was re-read later.
    const rows = [
        row("A", "2026-10-21T00:00:00.000Z", "2026-10-22T09:00:00.000Z"),
        row("B", "2026-10-20T00:00:00.000Z", "2026-10-22T10:00:00.000Z"),
        row("C", "2026-10-19T00:00:00.000Z", "2026-10-22T11:30:00.000Z"),
        row("D", "2026-10-18T00:00:00.000Z", "2026-10-21T08:00:00.000Z"),
    ];
    const r = await savedReader(fakeTable(rows))();
    expect(r.syncedAt).toBe("2026-10-22T11:30:00.000Z");
    expect(r.rows.map(x => x.id)).toEqual(["A", "B", "C", "D"]);
    expect(r.rows[0]).toMatchObject({ net_ghs: 3.43, fees_ghs: 0 });
});

test("savedReader: no saved rows gives syncedAt null", async () => {
    const { savedReader } = await import("../../../src/lib/billing/paystackReports");
    const r = await savedReader(fakeTable([]))();
    expect(r).toEqual({ rows: [], syncedAt: null });
});
