import "./stubSupabaseEnv";
import { test, expect } from "@playwright/test";
import { ledgerRowFor, takenFrom } from "../../../src/lib/billing/payoutLedger";
import { subaccountShareOf } from "../../../src/lib/paystack/api";
import { ledgerTxOf } from "../../../src/lib/paystackReconcile";
import { BILLING_DEFAULTS } from "../../../src/lib/billing/settings";

// Transaction shapes as Paystack sends them (amounts in pesewas). The first
// mirrors order 3512F7BD: total 137.50, charged 140.24, admin 3.44 by the
// site's split group.
const ENV = "SPL_1SuC2NjD2J";
const ADMIN = "ACCT_admin123";
const ORDER = "6c1f6a3e-6f0e-4d3a-9b3c-1b2a3c4d5e6f";

const viaEnvSplit = {
    reference: "ref-3512", status: "success", amount: 14024, requested_amount: 13750, fees: 274, paid_at: "2026-10-20T10:00:00.000Z",
    metadata: { orderId: ORDER, platform_fee_amount: 2.5, platform_fee_label: "Processing fee" },
    split: { split_code: ENV, shares: { paystack: 274, integration: 13406, subaccounts: [{ subaccount_code: "ACCT_envadmin", amount: 344 }] } },
};
const viaDynamic = {
    reference: "ref-dyn", status: "success", amount: 45386, requested_amount: 44500, fees: 886,
    metadata: { source: "pos", pos_session_id: ORDER, platform_fee_amount: 10, platform_fee_base: 400, admin_payout: { r: "requested", due: 11.13, take: 11.13 } },
    subaccount: { subaccount_code: ADMIN }, fees_split: JSON.stringify({ paystack: 886, integration: 43387, subaccount: 1113 }),
};

test("what reached the admin, read from either split shape", () => {
    expect(subaccountShareOf(viaDynamic, ADMIN)).toBe(1113);
    expect(subaccountShareOf(viaDynamic, "ACCT_other")).toBeNull();
    expect(subaccountShareOf(viaEnvSplit, "ACCT_envadmin")).toBe(344);
    // No admin subaccount stored yet: the env split group is the admin split.
    expect(takenFrom(viaEnvSplit, null, ENV)).toBe(344);
    expect(takenFrom(viaEnvSplit, null, "SPL_other")).toBe(0);
    expect(takenFrom(viaDynamic, ADMIN, ENV)).toBe(1113);
});

test("today's payments: switch off, env split paid the admin, nothing owed", () => {
    const row = ledgerRowFor(viaEnvSplit, BILLING_DEFAULTS, { envSplitCode: ENV, feePct: 2.5 })!;
    expect(row).toMatchObject({
        reference: "ref-3512", source: "checkout", order_id: ORDER, amount_ghs: 137.5, charged_ghs: 140.24, fee_ghs: 2.5,
        fee_base_ghs: 100, share_due_ghs: 3.44, taken_ghs: 3.44, outcome: "paid_by_split", skip_reason: null,
        paid_at: "2026-10-20T10:00:00.000Z",
    });
});

test("switch on: the share planned at the start is the share recorded", () => {
    const row = ledgerRowFor(viaDynamic, { ...BILLING_DEFAULTS, payoutSplitLive: true, adminSubaccountCode: ADMIN }, { envSplitCode: ENV, feePct: 2.5 })!;
    expect(row).toMatchObject({ source: "pos", pos_session_id: ORDER, share_due_ghs: 11.13, taken_ghs: 11.13, outcome: "paid_by_split" });
    // Planned, but Paystack paid nothing to the admin: the split failed and it stays owed.
    const failed = ledgerRowFor({ ...viaDynamic, fees_split: null, subaccount: null }, { ...BILLING_DEFAULTS, adminSubaccountCode: ADMIN }, { envSplitCode: ENV, feePct: 2.5 })!;
    expect(failed).toMatchObject({ outcome: "owed", skip_reason: "split_failed", share_due_ghs: 11.13, taken_ghs: 0 });
});

test("skipped shares are recorded as owed with the reason, and payments with no fee are left out", () => {
    const off = ledgerRowFor({ ...viaEnvSplit, split: null }, BILLING_DEFAULTS, { envSplitCode: ENV, feePct: 2.5 })!;
    expect(off).toMatchObject({ outcome: "owed", skip_reason: "switch_off", share_due_ghs: 3.44, taken_ghs: 0 });
    const small = ledgerRowFor({ reference: "r-small", status: "success", amount: 410, requested_amount: 410, metadata: { orderId: ORDER, platform_fee_amount: 0.1, admin_payout: { r: "small", due: 0.1, take: 0 } } }, BILLING_DEFAULTS, { envSplitCode: ENV, feePct: 2.5 })!;
    expect(small).toMatchObject({ outcome: "owed", skip_reason: "small", share_due_ghs: 0.1 });
    expect(ledgerRowFor({ reference: "gift", status: "success", amount: 50000, metadata: { type: "gift_card" } }, BILLING_DEFAULTS, { envSplitCode: ENV, feePct: 2.5 })).toBeNull();
    expect(ledgerRowFor({ ...viaEnvSplit, status: "failed" }, BILLING_DEFAULTS, { envSplitCode: ENV, feePct: 2.5 })).toBeNull();
    expect(ledgerRowFor({ ...viaEnvSplit, reference: "" }, BILLING_DEFAULTS, { envSplitCode: ENV, feePct: 2.5 })).toBeNull();
});

test("the verdict sent to staff screens never carries the card authorization", () => {
    const raw = { ...viaEnvSplit, authorization: { authorization_code: "AUTH_secret", last4: "4081" }, customer: { email: "c@x.com" } };
    const tx = ledgerTxOf(raw);
    expect(JSON.stringify(tx)).not.toMatch(/AUTH_secret|authorization|c@x\.com/);
    expect(ledgerRowFor(tx, BILLING_DEFAULTS, { envSplitCode: ENV, feePct: 2.5 })).toMatchObject({ taken_ghs: 3.44, amount_ghs: 137.5 });
});
