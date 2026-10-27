// The live side of the unpaid-order reminder: orders, the claim, the
// customer's conversation and the provider. Server-only.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createChatbotsAfrica } from "@/lib/messaging/chatbotsAfrica";
import { logOutbound } from "./conversationStore";
import type { NudgeDeps } from "./unpaidNudge";

// wa_nudged_at is not in the generated Supabase types until the migration is applied.
const db = supabaseAdmin as any;
const last9 = (phone: string) => phone.replace(/\D/g, "").slice(-9);

export function liveNudgeDeps(templateId: number | null = null): NudgeDeps {
    const sender = createChatbotsAfrica();
    return {
        candidates: async (from, to) => {
            const { data, error } = await db.from("orders").select("id, customer_name, customer_phone, created_at")
                .eq("source", "whatsapp").eq("payment_status", "pending").in("status", ["pending", "reservation_expired"])
                .is("wa_nudged_at", null).gte("created_at", from.toISOString()).lte("created_at", to.toISOString())
                .order("created_at", { ascending: true }).limit(50);
            if (error) throw error;
            return data ?? [];
        },
        claim: async orderId => {
            const { data, error } = await db.from("orders").update({ wa_nudged_at: new Date().toISOString() })
                .eq("id", orderId).is("wa_nudged_at", null).select("id");
            if (error) throw error;
            return (data ?? []).length === 1;
        },
        conversation: async phone => {
            const { data, error } = await db.from("whatsapp_conversations").select("id, opted_out_at, handed_off_at, last_inbound_at")
                .eq("wa_phone_number", phone).maybeSingle();
            if (error) throw error;
            return data ? { id: data.id, optedOut: !!data.opted_out_at, handedOff: !!data.handed_off_at, lastInboundAt: data.last_inbound_at ?? null } : null;
        },
        orderedSince: async (phone, since, exceptId) => {
            const { data, error } = await db.from("orders").select("id, customer_phone")
                .gt("created_at", since).neq("id", exceptId).in("payment_status", ["pending", "processing", "paid"])
                .not("status", "in", "(cancelled,reservation_expired)").limit(200);
            if (error) throw error;
            return (data ?? []).some((o: { customer_phone: string | null }) => last9(o.customer_phone ?? "") === last9(phone));
        },
        sendText: (to, text) => sender.sendText(to, text, { event: "whatsapp_unpaid_nudge" }),
        templateId,
        sendTemplate: (to, id, placeholders) => sender.sendTemplate(to, { templateId: id, type: "text", placeholders }, { event: "whatsapp_unpaid_nudge" }),
        logOutbound,
    };
}
