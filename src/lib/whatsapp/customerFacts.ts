// What we know about a WhatsApp number from earlier orders, and when the chat
// last moved, for the assistant's facts block. Server-only (service role).
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isPlaceholderEmail } from "@/lib/ai/missTokyoAi/tools/shared";
import { last9 } from "@/lib/phoneTail";
import { customerFacts, type CustomerRecord } from "@/lib/ai/shopAssistant/facts";

const db = supabaseAdmin as any;

export async function customerRecord(phone: string): Promise<CustomerRecord | null> {
    const tail = last9(phone);
    if (!tail) return null;
    const { data, error } = await supabaseAdmin.from("orders")
        .select("customer_name, customer_email, shipping_address, delivery_method")
        .ilike("customer_phone", `%${tail}`).order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    const rows = data ?? [];
    if (rows.length === 0) return { orders: 0, name: null, email: null, address: null };
    const email = rows.map(r => r.customer_email?.trim() ?? "").find(e => e && !isPlaceholderEmail(e)) ?? null;
    const shipped = rows.find(r => r.delivery_method !== "pickup" && (r.shipping_address as any)?.text?.trim());
    const addr = shipped ? (shipped.shipping_address as { text?: string; region?: string }) : null;
    return {
        orders: rows.length,
        name: rows.find(r => r.customer_name?.trim())?.customer_name?.trim() ?? null,
        email,
        address: addr?.text ? `${addr.text.trim().slice(0, 160)}${addr.region ? ` · ${addr.region}` : ""}` : null,
    };
}

/** The facts block for this turn. Never throws: without it the assistant just asks. */
export async function factsFor(conversationId: string, phone: string, now = new Date()): Promise<string | null> {
    try {
        const [record, last] = await Promise.all([
            customerRecord(phone),
            // The message being answered isn't logged yet, so the latest row is the one before it.
            db.from("message_log").select("created_at").eq("conversation_id", conversationId)
                .order("created_at", { ascending: false }).limit(1),
        ]);
        if (last.error) throw last.error;
        return customerFacts({ now, record, lastMessageAt: last.data?.[0]?.created_at ?? null });
    } catch (e) {
        console.error("[whatsapp] facts not loaded", { err: String(e) });
        return null;
    }
}
