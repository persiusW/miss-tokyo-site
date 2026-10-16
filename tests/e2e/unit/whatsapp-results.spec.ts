import { test, expect } from "@playwright/test";
import { USD_TO_GHS } from "../../../src/lib/ai/pricing";
import { summariseResults } from "../../../src/lib/whatsapp/results";

const rows = {
    turns: [
        { conversation_id: "c1", cost_usd: "0.02", created_at: "2026-10-15T10:00:00Z" },
        { conversation_id: "c1", cost_usd: 0.03, created_at: "2026-10-15T10:01:00Z" },
        { conversation_id: "c2", cost_usd: null, created_at: "2026-10-02T10:00:00Z" },
        { conversation_id: null, cost_usd: 0.01, created_at: "2026-10-15T11:00:00Z" },
    ],
    orders: [
        { payment_status: "paid", total_amount: "305.5", created_at: "2026-10-15T10:05:00Z" },
        { payment_status: "pending", total_amount: 200, created_at: "2026-10-15T10:06:00Z" },
        { payment_status: "paid", total_amount: 100, created_at: "2026-10-02T10:05:00Z" },
    ],
    nudged: [
        { payment_status: "paid", total_amount: 200, wa_nudged_at: "2026-10-15T10:40:00Z" },
        { payment_status: "pending", total_amount: 90, wa_nudged_at: "2026-10-15T10:41:00Z" },
    ],
    sends: [
        { event: "whatsapp_unpaid_nudge", created_at: "2026-10-15T10:40:00Z" },
        { event: "whatsapp_unpaid_nudge", created_at: "2026-10-15T10:41:00Z" },
        { event: "whatsapp_restock_alert", created_at: "2026-10-03T09:00:00Z" },
    ],
};

test("a period counts chats, orders, paid sales, conversion, cost and what reminders recovered", () => {
    expect(summariseResults("2026-10-09T00:00:00Z", rows)).toEqual({
        chats: 1, replies: 3, orders: 2, paid_orders: 1, sales_ghs: 305.5, conversion_pct: 100,
        ai_cost_ghs: Math.round(0.06 * USD_TO_GHS * 100) / 100,
        reminders_sent: 2, recovered_orders: 1, recovered_ghs: 200, restock_alerts_sent: 0,
    });
    const month = summariseResults("2026-09-16T00:00:00Z", rows);
    expect([month.chats, month.paid_orders, month.sales_ghs, month.conversion_pct, month.restock_alerts_sent]).toEqual([2, 2, 405.5, 100, 1]);
});

test("no chats: conversion is unknown, not zero", () => {
    expect(summariseResults("2026-10-09T00:00:00Z", { turns: [], orders: [], nudged: [], sends: [] }).conversion_pct).toBe(null);
});
