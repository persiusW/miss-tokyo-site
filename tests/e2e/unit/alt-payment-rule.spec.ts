import { test, expect } from "@playwright/test";
import { altPayment, owedFrom, FAILURES_BEFORE_ALTERNATIVE, OUTAGE_ERRORS } from "../../../src/lib/payments/altPaymentRule";
import { ERRORS } from "../../../src/lib/errors/catalogue";

const base = { owed: true, channel: "pos" as const, failures: 0, outageErrors: 0 };

test("owner thresholds", () => {
    expect(FAILURES_BEFORE_ALTERNATIVE).toBe(2);
    expect(OUTAGE_ERRORS).toBe(2);
});

test("nothing owed → nothing suggested", () => {
    expect(altPayment({ ...base, owed: false, failures: 5, outageErrors: 5 })).toEqual({ allowed: false, reason: null, options: [] });
});

test("one failure is a retry, two unlock alternatives", () => {
    expect(altPayment({ ...base, failures: 1 }).allowed).toBe(false);
    expect(altPayment({ ...base, failures: 2 })).toEqual({ allowed: true, reason: "REPEATED_FAILURES", options: ["new_link", "card_or_momo", "gift_card_plus_link"] });
});

test("an outage unlocks alternatives on every sale", () => {
    expect(altPayment({ ...base, outageErrors: 2 })).toMatchObject({ allowed: true, reason: "OUTAGE" });
    expect(altPayment({ ...base, outageErrors: 1 }).allowed).toBe(false);
});

test("gift card + link only at the till; never cash", () => {
    expect(altPayment({ ...base, channel: "online", failures: 2 }).options).toEqual(["new_link", "card_or_momo"]);
    for (const ch of ["pos", "online", "ai", "pay_link", "invoice"] as const) {
        for (const o of altPayment({ ...base, channel: ch, failures: 9, outageErrors: 9 }).options) expect(o).not.toMatch(/cash/i);
    }
});

test("what counts as still owed", () => {
    for (const s of ["draft", "pending_payment", "pending", "processing"]) expect(owedFrom(s), s).toBe(true);
    for (const s of ["paid", "cancelled", "expired", "refunded", "fulfilled", null, undefined]) expect(owedFrom(s), String(s)).toBe(false);
});

test("retry steps never offer an alternative the rule hasn't unlocked", () => {
    const ALT = /new (payment )?link|a new one|card|another mobile money|gift card/i;
    expect("Send the same link again, or a new one.").toMatch(ALT); // the old wording would fail
    for (const code of ["PAY-01", "PAY-04", "PAY-05"] as const) {
        for (const s of (ERRORS[code] as { steps?: string[] }).steps ?? []) {
            expect(s, code).not.toMatch(ALT);
        }
    }
});
