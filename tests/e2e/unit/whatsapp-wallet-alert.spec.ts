import { test, expect } from "@playwright/test";
import { isWalletCheckMinute, walletAlertText, walletIsLow } from "../../../src/lib/whatsapp/walletAlertRules";

test("the wallet is low below the alert level; 0 turns the alert off; an unknown balance never alerts", () => {
    expect(walletIsLow(49.99, 50)).toBe(true);
    expect(walletIsLow(50, 50)).toBe(false);
    expect(walletIsLow(10, 0)).toBe(false);
    expect(walletIsLow(null, 50)).toBe(false);
    expect(walletIsLow(NaN, 50)).toBe(false);
});

test("checked in the first sweep of each hour, and the text says what to do", () => {
    expect(isWalletCheckMinute(new Date("2026-10-21T10:03:00Z"))).toBe(true);
    expect(isWalletCheckMinute(new Date("2026-10-21T10:05:00Z"))).toBe(false);
    const t = walletAlertText(23.4, 50);
    expect(t).toBe("Miss Tokyo WhatsApp: the Chatbots Africa wallet is low (GHS 23.40, alert below GHS 50.00). Top it up so WhatsApp replies and order updates keep sending.");
    expect(t.length).toBeLessThanOrEqual(320);
});
