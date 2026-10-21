import { test, expect } from "@playwright/test";
import { toP, fromP, r2 } from "../../../src/lib/billing/money";
import { shareDue, planTake, ledgerOutcome, ledgerTotals, baseFromFee, DEFAULT_SHARE_PCT, type ShareRule } from "../../../src/lib/billing/payoutRules";
import { smsUnits, smsEncoding } from "../../../src/lib/billing/smsUnits";
import { periodFor, closedPeriods, previousPeriod, periodProgress, periodLabel, clampCutoff } from "../../../src/lib/billing/period";
import { priceLines, clientLines, totalOf, proposeCap, projectTotal, capState, statementKey, DEFAULT_VISIBILITY, type Rates } from "../../../src/lib/billing/statement";

// ── Money ───────────────────────────────────────────────────────────────
test("money rounds to the pesewa, half away from zero", () => {
    expect(toP(1.005)).toBe(101);
    expect(toP("3.4375")).toBe(344);
    expect(toP(-2.345)).toBe(-235);
    expect(toP(NaN)).toBe(0);
    expect(fromP(344)).toBe(3.44);
    expect(r2(0.1 + 0.2)).toBe(0.3);
});

// ── Admin share ─────────────────────────────────────────────────────────
const TODAY: ShareRule = { mode: "pct_of_order_total", pct: DEFAULT_SHARE_PCT, paystackPct: 1.95 };

// Four real orders read from live Paystack on 2026-10-21 (lead's check):
// order total → what SPL_1SuC2NjD2J sent the admin subaccount; main = total − share.
const REAL: { total: number; admin: number; charged: number; paystackFee: number }[] = [
    { total: 137.5, admin: 3.44, charged: 140.24, paystackFee: 2.74 },
    { total: 445.0, admin: 11.13, charged: 453.86, paystackFee: 8.86 },
    { total: 240.0, admin: 6.0, charged: 244.78, paystackFee: 4.78 },
    { total: 219.5, admin: 5.49, charged: 223.87, paystackFee: 4.37 },
];

test("the default rule reproduces today's split to the pesewa on four real orders", () => {
    for (const o of REAL) {
        const due = shareDue(TODAY, { totalGhs: o.total, feeGhs: 2.5, baseGhs: 100 });
        expect(due, `${o.total}`).toBe(o.admin);
        const plan = planTake({ live: true, subaccount: "ACCT_admin", amountGhs: o.total, dueGhs: due, owedGhs: 0, minGhs: 5, paystackPct: 1.95 });
        expect(plan.takeGhs, `${o.total}`).toBe(o.admin);
        // transaction_charge is what the main account keeps.
        expect(fromP(plan.transactionChargeP!), `${o.total}`).toBe(r2(o.total - o.admin));
        // The customer paid Paystack on top: charged − total is the fee, exactly.
        expect(r2(o.charged - o.total)).toBe(o.paystackFee);
    }
});

test("each alternative rule", () => {
    const p = { totalGhs: 137.5, feeGhs: 2.5, baseGhs: 100 };
    expect(shareDue({ mode: "fee_minus_paystack", pct: null, paystackPct: 1.95 }, p)).toBe(0.55);
    expect(shareDue({ mode: "full_fee", pct: null, paystackPct: 1.95 }, p)).toBe(2.5);
    expect(shareDue({ mode: "custom_pct", pct: 1, paystackPct: 1.95 }, p)).toBe(1);
    // custom % never takes more than the fee; fee-minus-Paystack never goes negative.
    expect(shareDue({ mode: "custom_pct", pct: 10, paystackPct: 1.95 }, p)).toBe(2.5);
    expect(shareDue({ mode: "fee_minus_paystack", pct: null, paystackPct: 5 }, p)).toBe(0);
    // No processing fee (cash, gift cards): no share under any rule.
    expect(shareDue(TODAY, { totalGhs: 500, feeGhs: 0, baseGhs: 500 })).toBe(0);
});

test("a base older payments lack is worked back from the fee", () => {
    expect(baseFromFee(2.5, 2.5)).toBe(100);
    expect(baseFromFee(11.25, 2.5)).toBe(450);
    expect(baseFromFee(0, 2.5)).toBeNull();
    expect(baseFromFee(2.5, 0)).toBeNull();
});

test("payments of GH₵ 5 or less carry no split, and the switch and the account gate everything", () => {
    const base = { live: true, subaccount: "ACCT_x", dueGhs: 0.13, owedGhs: 0, minGhs: 5, paystackPct: 1.95 };
    expect(planTake({ ...base, amountGhs: 5 })).toEqual({ takeGhs: 0, transactionChargeP: null, reason: "small" });
    expect(planTake({ ...base, amountGhs: 4.99 }).reason).toBe("small");
    expect(planTake({ ...base, amountGhs: 5.01 }).reason).toBeNull();
    expect(planTake({ ...base, live: false, amountGhs: 500 }).reason).toBe("switch_off");
    expect(planTake({ ...base, subaccount: null, amountGhs: 500 }).reason).toBe("no_account");
});

test("owed shares ride on later payments, capped so the main account keeps Paystack's fee and most of the money", () => {
    const base = { live: true, subaccount: "ACCT_x", minGhs: 5, paystackPct: 1.95 };
    // 20 owed + 3.44 due on a 137.50 order: the cap is 20% (27.50).
    expect(planTake({ ...base, amountGhs: 137.5, dueGhs: 3.44, owedGhs: 20 }).takeGhs).toBe(23.44);
    // 100 owed: only 27.50 goes now; the rest stays owed.
    const big = planTake({ ...base, amountGhs: 137.5, dueGhs: 3.44, owedGhs: 100 });
    expect(big.takeGhs).toBe(27.5);
    expect(big.transactionChargeP).toBe(11000);
    // A credit (admin was paid ahead) comes off, and never makes the charge negative.
    expect(planTake({ ...base, amountGhs: 137.5, dueGhs: 3.44, owedGhs: -1 }).takeGhs).toBe(2.44);
    expect(planTake({ ...base, amountGhs: 137.5, dueGhs: 3.44, owedGhs: -50 })).toMatchObject({ takeGhs: 0, transactionChargeP: null });
    // transaction_charge + take is always the whole amount, and never below 0.
    for (const amt of [5.01, 6, 25, 137.5, 999.99, 25000]) {
        const p = planTake({ ...base, amountGhs: amt, dueGhs: r2(amt * 0.025), owedGhs: 40 });
        if (p.transactionChargeP != null) {
            expect(p.transactionChargeP + toP(p.takeGhs)).toBe(toP(amt));
            expect(p.transactionChargeP).toBeGreaterThan(Math.ceil(toP(amt) * 0.0195));
        }
    }
});

test("ledger outcomes and carried-forward totals", () => {
    expect(ledgerOutcome(3.44, 3.44, "requested")).toEqual({ outcome: "paid_by_split", reason: null });
    expect(ledgerOutcome(3.44, 0, "requested")).toEqual({ outcome: "owed", reason: "split_failed" });
    expect(ledgerOutcome(3.44, 0, undefined)).toEqual({ outcome: "owed", reason: "switch_off" });
    expect(ledgerOutcome(0.12, 0, "small")).toEqual({ outcome: "owed", reason: "small" });
    expect(ledgerOutcome(0, 0, undefined)).toEqual({ outcome: "no_share", reason: null });
    // Three small payments skipped, then one carries all of it: nothing is lost.
    const rows = [
        { share_due_ghs: 0.12, taken_ghs: 0 }, { share_due_ghs: "0.10", taken_ghs: 0 }, { share_due_ghs: 0.11, taken_ghs: 0 },
        { share_due_ghs: 3.44, taken_ghs: 3.77 },
    ];
    expect(ledgerTotals(rows)).toEqual({ dueGhs: 3.77, takenGhs: 3.77, owedGhs: 0 });
    // A manual payment (due 0, taken > 0) settles what is owed.
    expect(ledgerTotals([{ share_due_ghs: 10, taken_ghs: 0 }, { share_due_ghs: 0, taken_ghs: 4 }]).owedGhs).toBe(6);
});

// ── SMS units ───────────────────────────────────────────────────────────
test("SMS units: 160/153 for GSM-7, 70/67 for UCS-2, extension characters count twice", () => {
    expect(smsUnits("")).toBe(1);
    expect(smsUnits("a".repeat(160))).toBe(1);
    expect(smsUnits("a".repeat(161))).toBe(2);
    expect(smsUnits("a".repeat(306))).toBe(2);
    expect(smsUnits("a".repeat(307))).toBe(3);
    expect(smsUnits("€".repeat(80))).toBe(1);
    expect(smsUnits("€".repeat(81))).toBe(2);
    // The cedi sign is not GSM-7: the whole message goes as UCS-2.
    expect(smsEncoding("Total GH₵ 461.25")).toBe("ucs2");
    expect(smsUnits("₵" + "a".repeat(69))).toBe(1);
    expect(smsUnits("₵" + "a".repeat(70))).toBe(2);
    expect(smsUnits("₵" + "a".repeat(133))).toBe(2);
    expect(smsUnits("₵" + "a".repeat(134))).toBe(3);
    expect(smsUnits("Hi 😀")).toBe(1);
});

// ── Statement periods (Accra = UTC) ─────────────────────────────────────
test("statement periods run from the day after the cut-off through the cut-off day", () => {
    const at = (s: string) => new Date(s);
    expect(periodFor(at("2026-10-21T12:00:00Z"), 28)).toMatchObject({ start: "2026-09-29", end: "2026-10-28" });
    expect(periodFor(at("2026-10-28T23:59:59Z"), 28)).toMatchObject({ start: "2026-09-29", end: "2026-10-28", toIso: "2026-10-29T00:00:00.000Z" });
    expect(periodFor(at("2026-10-29T00:00:00Z"), 28)).toMatchObject({ start: "2026-10-29", end: "2026-11-28" });
    // February has a 28th, so cut-off 28 never skips: 29 Jan to 28 Feb.
    expect(periodFor(at("2027-02-10T00:00:00Z"), 28)).toMatchObject({ start: "2027-01-29", end: "2027-02-28" });
    expect(periodFor(at("2027-03-01T00:00:00Z"), 28)).toMatchObject({ start: "2027-03-01", end: "2027-03-28" });
    // Cut-off 1: 2nd to the 1st. Year boundary.
    expect(periodFor(at("2026-12-15T00:00:00Z"), 1)).toMatchObject({ start: "2026-12-02", end: "2027-01-01" });
    expect(periodFor(at("2027-01-01T08:00:00Z"), 1)).toMatchObject({ start: "2026-12-02", end: "2027-01-01" });
    // Billing started 8 Oct 2026: the first period is trimmed.
    expect(periodFor(at("2026-10-21T00:00:00Z"), 28, "2026-10-08")).toMatchObject({ start: "2026-10-08", end: "2026-10-28" });
    expect(previousPeriod(periodFor(at("2026-11-05T00:00:00Z"), 28, "2026-10-08"), 28, "2026-10-08")).toMatchObject({ start: "2026-10-08", end: "2026-10-28" });
    expect(clampCutoff(31)).toBe(28);
    expect(clampCutoff("15")).toBe(15);
});

test("closed periods since billing started, oldest first, the running one left out", () => {
    expect(closedPeriods(new Date("2026-10-21T00:00:00Z"), 28, "2026-10-08")).toEqual([]);
    const c = closedPeriods(new Date("2026-12-02T00:00:00Z"), 28, "2026-10-08");
    expect(c.map(p => `${p.start}..${p.end}`)).toEqual(["2026-10-08..2026-10-28", "2026-10-29..2026-11-28"]);
    expect(periodProgress(c[1], new Date("2026-11-03T10:00:00Z"))).toEqual({ days: 31, elapsed: 6 });
    expect(periodLabel(c[1])).toBe("29 Oct to 28 Nov 2026");
});

// ── Pricing, markup, visibility, caps ───────────────────────────────────
const RATES: Rates = { aiUnit: "cost", aiRate: 1, usdToGhs: 15.5, smsRate: 0.05, waMessageRate: 0.1, waTemplateRate: 0.4, markupPct: 20 };
const USE = { aiCostUsd: 1.5145, aiReplies: 110, smsMessages: 117, smsUnits: 180, waMessages: 96, waTemplates: 5 };

test("lines are priced at the admin's rates and lifted by one markup, to the pesewa", () => {
    const lines = priceLines(USE, RATES, [{ id: "1", description: "Domain renewal", quantity: 1, unit: "item", unitPrice: 120 }]);
    const by = Object.fromEntries(lines.map(l => [l.key, l]));
    expect(by.ai.costGhs).toBe(23.47); // 1.5145 × 15.5
    expect(by.ai.baseGhs).toBe(23.47);
    expect(by.ai.amountGhs).toBe(28.16);
    expect(by.sms.amountGhs).toBe(10.8); // 180 × 0.05 × 1.2
    expect(by.wa_message.amountGhs).toBe(11.52);
    expect(by.wa_template.amountGhs).toBe(2.4);
    expect(by["other:1"].amountGhs).toBe(144);
    expect(totalOf(lines)).toBe(196.88);
    // Per reply instead of by cost.
    const perReply = priceLines(USE, { ...RATES, aiUnit: "reply", aiRate: 0.5, markupPct: 0 });
    expect(perReply[0].amountGhs).toBe(55);
});

test("a service with no price yet is left off the bill, not billed at zero", () => {
    const lines = priceLines(USE, { ...RATES, smsRate: null });
    const sms = lines.find(l => l.key === "sms")!;
    expect(sms.priced).toBe(false);
    expect(clientLines(lines, DEFAULT_VISIBILITY, 20).map(l => l.service)).not.toContain("sms");
    expect(totalOf(lines)).toBe(r2(28.16 + 11.52 + 2.4));
});

test("the client never sees a cost price or the markup, and hidden lines still add up", () => {
    const lines = priceLines(USE, RATES);
    const shown = clientLines(lines, { ...DEFAULT_VISIBILITY, wa_template: false, unit_prices: true }, 20);
    expect(JSON.stringify(shown)).not.toMatch(/cost|markup|baseGhs|unitRate/);
    expect(shown.find(l => l.service === "ai")!.unitPriceGhs).toBeUndefined(); // AI by cost has no unit price
    expect(shown.find(l => l.service === "sms")!.unitPriceGhs).toBe(0.06);
    expect(shown.at(-1)).toMatchObject({ description: "Other services", amountGhs: 2.4 });
    expect(totalOf(shown)).toBe(totalOf(lines));
    const noQty = clientLines(lines, { ...DEFAULT_VISIBILITY, quantities: false }, 20);
    expect(noQty.every(l => l.quantity === 0 && l.unit === "")).toBe(true);
});

test("the proposed cap: projected total plus a fifth, rounded up to a tidy step", () => {
    expect(projectTotal(30, 10, 30)).toBe(90);
    expect(proposeCap(90).capGhs).toBe(150); // 108 → step 50
    expect(proposeCap(40).capGhs).toBe(50); // 48 → step 10
    expect(proposeCap(2000).capGhs).toBe(2400);
    expect(proposeCap(0)).toMatchObject({ capGhs: 10 });
    expect(proposeCap(90).why).toContain("GH₵ 90.00");
    expect(capState(79, 100)).toBe("ok");
    expect(capState(80, 100)).toBe("near");
    expect(capState(100, 100)).toBe("reached");
    expect(capState(100, null)).toBe("none");
    expect(statementKey("mt", "2026-10-08", "2026-10-28")).toBe("mt:2026-10-08:2026-10-28");
});
