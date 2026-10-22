import "./stubSupabaseEnv";
import { test, expect } from "@playwright/test";
import { listSettlementsPage, settlementTransactions, type Settlement, type SettlementTx } from "../../../src/lib/paystack/api";
import { settlementRow, snapshotRow, sourceOf, txRow } from "../../../src/lib/billing/settlementSync";
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
