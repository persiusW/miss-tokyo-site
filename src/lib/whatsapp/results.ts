// What WhatsApp brings in, for AI Settings: chats the assistant answered,
// orders placed in them, paid sales, what the assistant cost, and what the
// unpaid reminder and back-in-stock alerts did. Pure: rows in, numbers out.
import { USD_TO_GHS } from "@/lib/ai/pricing";

export type TurnRow = { conversation_id: string | null; cost_usd: number | string | null; created_at: string };
export type OrderRow = { payment_status: string | null; total_amount: number | string | null; created_at: string };
export type NudgedRow = { payment_status: string | null; total_amount: number | string | null; wa_nudged_at: string };
export type SendRow = { event: string | null; created_at: string };

export type Results = {
    chats: number; replies: number; orders: number; paid_orders: number; sales_ghs: number;
    /** Paid orders per 100 chats; null with no chats. */
    conversion_pct: number | null;
    ai_cost_ghs: number;
    reminders_sent: number; recovered_orders: number; recovered_ghs: number;
    restock_alerts_sent: number;
};

const money = (n: number) => Math.round(n * 100) / 100;
const num = (v: unknown) => Number(v) || 0;

export function summariseResults(since: string, rows: { turns: TurnRow[]; orders: OrderRow[]; nudged: NudgedRow[]; sends: SendRow[] }): Results {
    const turns = rows.turns.filter(r => r.created_at >= since);
    const orders = rows.orders.filter(r => r.created_at >= since);
    const paid = orders.filter(r => r.payment_status === "paid");
    const chats = new Set(turns.map(r => r.conversation_id).filter(Boolean)).size;
    const recovered = rows.nudged.filter(r => r.wa_nudged_at >= since && r.payment_status === "paid");
    const sends = rows.sends.filter(r => r.created_at >= since);
    return {
        chats,
        replies: turns.length,
        orders: orders.length,
        paid_orders: paid.length,
        sales_ghs: money(paid.reduce((s, r) => s + num(r.total_amount), 0)),
        conversion_pct: chats > 0 ? Math.round((paid.length / chats) * 1000) / 10 : null,
        ai_cost_ghs: money(turns.reduce((s, r) => s + num(r.cost_usd), 0) * USD_TO_GHS),
        reminders_sent: sends.filter(r => r.event === "whatsapp_unpaid_nudge").length,
        recovered_orders: recovered.length,
        recovered_ghs: money(recovered.reduce((s, r) => s + num(r.total_amount), 0)),
        restock_alerts_sent: sends.filter(r => r.event === "whatsapp_restock_alert").length,
    };
}
