// The customer behind a WhatsApp chat, for the inbox: their orders found by
// phone number (the last 9 digits, since orders store it as 0…, +233… or
// 233…), how many and what they spent. Server-only (service role).
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isPlaceholderEmail, last9 } from "@/lib/ai/missTokyoAi/tools/shared";
import { lineLabel } from "@/lib/ai/shopAssistant/cartRules";
import { loadCart } from "@/lib/ai/shopAssistant/cartStore";
import { waVisitorKey } from "./conversationStore";

export type PanelOrder = { id: string; ref: string | null; at: string; total: number; payment: string | null; fulfilment: string | null };
/** basket: what they have in the assistant's basket now (lines as the assistant reads them). */
export type CustomerPanel = { name: string | null; email: string | null; orders: number; paidOrders: number; spent: number; recent: PanelOrder[]; basket: string[] };

/** The placeholder email made for customers who gave none is not shown as theirs. */
const realEmail = (e: string | null) => (e && !isPlaceholderEmail(e) ? e : null);

export async function customerPanel(phone: string): Promise<CustomerPanel | null> {
    const tail = last9(phone);
    if (!tail) return null;
    const basket = (await loadCart(waVisitorKey(phone)).catch(() => [])).map(lineLabel);
    const { data, error } = await supabaseAdmin.from("orders")
        .select("id, ref, created_at, total_amount, payment_status, fulfillment_status, customer_name, customer_email")
        .ilike("customer_phone", `%${tail}`).order("created_at", { ascending: false }).limit(200);
    if (error) throw error;
    const rows = data ?? [];
    if (rows.length === 0) return { name: null, email: null, orders: 0, paidOrders: 0, spent: 0, recent: [], basket };
    const paid = rows.filter(r => r.payment_status === "paid");
    return {
        name: rows.find(r => r.customer_name?.trim())?.customer_name?.trim() ?? null,
        email: realEmail(rows.find(r => r.customer_email?.trim())?.customer_email?.trim() ?? null),
        orders: rows.length,
        paidOrders: paid.length,
        spent: Math.round(paid.reduce((n, r) => n + (Number(r.total_amount) || 0), 0) * 100) / 100,
        basket,
        recent: rows.slice(0, 5).map(r => ({
            id: r.id, ref: r.ref ?? null, at: r.created_at, total: Number(r.total_amount) || 0,
            payment: r.payment_status ?? null, fulfilment: r.fulfillment_status ?? null,
        })),
    };
}
