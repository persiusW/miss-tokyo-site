import "./stubSupabaseEnv";
import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { payoutFor, postWithPayout, withPayout, envSplitFields, SPLIT_KEYS, type PayoutArgs, type PayoutSource } from "../../../src/lib/billing/payoutInit";
import { BILLING_DEFAULTS, type BillingSettings } from "../../../src/lib/billing/settings";

// What customers are charged must be IDENTICAL with the automatic admin
// share off and on: only the split fields (and ledger metadata) change.

const ROOT = path.resolve(__dirname, "../../..");
const ENV = "SPL_1SuC2NjD2J";
const OFF: BillingSettings = { ...BILLING_DEFAULTS };
const ON: BillingSettings = { ...BILLING_DEFAULTS, payoutSplitLive: true, adminSubaccountCode: "ACCT_admin123" };
const deps = (s: BillingSettings, owed = 0) => ({ settings: async () => s, owedGhs: async () => owed, envSplitCode: ENV });

// Bodies as each path builds them before the split is added.
function baseBody(source: PayoutSource, a: PayoutArgs) {
    const amount = Math.round(a.amountGhs * 100);
    if (source === "invoice") return { name: "Invoice #AB12", amount, currency: "GHS", channels: ["mobile_money", "card"], metadata: { invoice_id: "x", source: "invoice", platform_fee_amount: a.feeGhs } };
    return { email: "c@x.com", amount, currency: "GHS", channels: ["mobile_money", "card", "bank_transfer"], metadata: { source, platform_fee_amount: a.feeGhs } };
}

const CASES: [PayoutSource, PayoutArgs][] = [
    ["checkout", { source: "checkout", amountGhs: 137.5, feeGhs: 2.5, baseGhs: 100 }],
    ["checkout", { source: "checkout", amountGhs: 4.1, feeGhs: 0.1, baseGhs: 4 }],
    ["pos", { source: "pos", amountGhs: 445, feeGhs: 10, baseGhs: 400 }],
    ["pos", { source: "pos", amountGhs: 580, feeGhs: 0, baseGhs: 580 }],
    ["invoice", { source: "invoice", amountGhs: 219.5, feeGhs: 5.36, baseGhs: 214.14 }],
    ["invoice", { source: "invoice", amountGhs: 3, feeGhs: 0.07, baseGhs: 2.93 }],
];

test("switch off: the env split exactly as before (checkout and POS from GH₵ 5, invoices always)", async () => {
    expect(envSplitFields("checkout", 4.99, ENV)).toEqual({});
    expect(envSplitFields("checkout", 5, ENV)).toEqual({ split_code: ENV });
    expect(envSplitFields("pos", 4.99, ENV)).toEqual({});
    expect(envSplitFields("invoice", 1, ENV)).toEqual({ split_code: ENV });
    expect(envSplitFields("checkout", 500, null)).toEqual({});
    for (const [src, a] of CASES) {
        const p = await payoutFor(a, deps(OFF));
        expect(p.fields, `${src} ${a.amountGhs}`).toEqual(envSplitFields(src, a.amountGhs, ENV));
        expect(p.dynamic).toBe(false);
        expect(Object.keys(p.meta).filter(k => p.meta[k] !== undefined)).toEqual(a.feeGhs > 0 ? ["platform_fee_base"] : []);
    }
});

test("the amount and every non-split field are identical with the switch off and on", async () => {
    for (const [src, a] of CASES) {
        for (const owed of [0, 12.5, -3]) {
            const body = baseBody(src, a);
            const off = withPayout(body, await payoutFor(a, deps(OFF, owed)));
            const on = withPayout(body, await payoutFor(a, deps(ON, owed)));
            expect(on.amount, `${src} ${a.amountGhs}`).toBe(body.amount);
            expect(off.amount).toBe(body.amount);
            const strip = (b: Record<string, unknown>) => {
                const c: Record<string, unknown> = { ...b };
                for (const k of SPLIT_KEYS) delete c[k];
                const m = { ...(c.metadata as Record<string, unknown>) };
                delete m.admin_payout; delete m.platform_fee_base;
                c.metadata = m;
                return c;
            };
            expect(strip(on)).toEqual(strip(off));
            expect(strip(on)).toEqual(strip(body));
        }
    }
});

test("switch on: the admin subaccount gets exactly the planned share, the main account the rest", async () => {
    const p = await payoutFor({ source: "checkout", amountGhs: 137.5, feeGhs: 2.5, baseGhs: 100 }, deps(ON));
    expect(p.fields).toEqual({ subaccount: "ACCT_admin123", transaction_charge: 13406, bearer: "account" });
    expect(p.meta.admin_payout).toEqual({ r: "requested", due: 3.44, take: 3.44 });
    // Owed shares ride along.
    const carry = await payoutFor({ source: "pos", amountGhs: 445, feeGhs: 10, baseGhs: 400 }, deps(ON, 4.5));
    expect(carry.fields.transaction_charge).toBe(44500 - 1113 - 450);
    // A payment of GH₵ 5 or less carries no split and no env split either; its share stays owed.
    const small = await payoutFor({ source: "invoice", amountGhs: 3, feeGhs: 0.07, baseGhs: 2.93 }, deps(ON));
    expect(small.fields).toEqual({});
    expect(small.meta.admin_payout).toMatchObject({ r: "small" });
    // On, but no admin payout account stored yet: the env split stays in charge.
    const noAcct = await payoutFor({ source: "checkout", amountGhs: 137.5, feeGhs: 2.5, baseGhs: 100 }, deps({ ...ON, adminSubaccountCode: null }));
    expect(noAcct.fields).toEqual({ split_code: ENV });
    expect(noAcct.meta.admin_payout).toMatchObject({ r: "no_account" });
    // Settings unreadable: behaves as off.
    const broken = await payoutFor({ source: "checkout", amountGhs: 137.5, feeGhs: 2.5, baseGhs: 100 }, { settings: async () => { throw new Error("db"); }, envSplitCode: ENV });
    expect(broken.fields).toEqual({ split_code: ENV });
});

test("a refused split retries once without it, same amount, share recorded as owed", async () => {
    const p = await payoutFor({ source: "checkout", amountGhs: 137.5, feeGhs: 2.5, baseGhs: 100 }, deps(ON));
    const sent: Record<string, unknown>[] = [];
    const res = await postWithPayout(async b => { sent.push(b); return new Response("{}", { status: sent.length === 1 ? 400 : 200 }); }, baseBody("checkout", { source: "checkout", amountGhs: 137.5, feeGhs: 2.5, baseGhs: 100 }), p);
    expect(res.status).toBe(200);
    expect(sent).toHaveLength(2);
    expect(sent[0].subaccount).toBe("ACCT_admin123");
    expect(sent[1].subaccount).toBeUndefined();
    expect(sent[1].amount).toBe(sent[0].amount);
    expect((sent[1].metadata as any).admin_payout).toMatchObject({ r: "split_failed" });
    // A 5xx is not a refusal of the split: no retry.
    const once: unknown[] = [];
    await postWithPayout(async b => { once.push(b); return new Response("{}", { status: 503 }); }, { amount: 1 }, p);
    expect(once).toHaveLength(1);
});

test("all three payment paths take their split from payoutFor and nowhere else", () => {
    const files = ["src/lib/checkout/createCheckoutOrder.ts", "src/app/api/pos/send-link/route.ts", "src/app/api/invoice/paystack-link/route.ts"];
    for (const f of files) {
        const src = fs.readFileSync(path.join(ROOT, f), "utf8");
        expect(src, f).toMatch(/payoutFor\(\{ source: ["'](checkout|pos|invoice)["']/);
        expect(src, f).toContain("postWithPayout(");
        expect(src, f).not.toContain("PAYSTACK_SPLIT_CODE");
        expect(src, f).not.toMatch(/split_code:|transaction_charge:/);
    }
});
