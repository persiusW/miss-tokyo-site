// The live side of WhatsApp order updates: settings, the customer's
// conversation (opened if they have none, so the update shows in the inbox),
// and the provider. Server-only. Never throws.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAiSettings } from "@/lib/ai/settings";
import { createChatbotsAfrica } from "@/lib/messaging/chatbotsAfrica";
import { logOutbound } from "./conversationStore";
import { sendOrderUpdate, type OrderEvent, type UpdateConversation, type UpdateExtra, type UpdateOrder, type UpdateOutcome } from "./orderUpdates";

const db = supabaseAdmin as any;

async function conversationFor(phone: string): Promise<UpdateConversation> {
    const pick = "id, opted_out_at, last_inbound_at";
    const read = () => db.from("whatsapp_conversations").select(pick).eq("wa_phone_number", phone).maybeSingle();
    let { data, error } = await read();
    if (error) throw error;
    if (!data) {
        const ins = await db.from("whatsapp_conversations").insert({ wa_phone_number: phone, provider: "chatbots_africa" }).select(pick).single();
        if (ins.error?.code === "23505") ({ data, error } = await read());
        else if (ins.error) throw ins.error;
        else data = ins.data;
        if (error) throw error;
    }
    return { id: data.id, optedOut: !!data.opted_out_at, lastInboundAt: data.last_inbound_at ?? null };
}

export async function notifyOrderOnWhatsApp(order: UpdateOrder, event: OrderEvent, extra: UpdateExtra = {}): Promise<UpdateOutcome> {
    try {
        const settings = await getAiSettings();
        const sender = createChatbotsAfrica();
        return await sendOrderUpdate(order, event, extra, {
            enabled: settings.whatsappEnabled && settings.whatsappStatusNotifications,
            templateIdFor: event => settings.whatsappStatusTemplateIds[event] ?? null,
            conversationFor,
            sendText: (to, text) => sender.sendText(to, text, { event: `order_update:${event}`, orderId: order.id }),
            sendTemplate: (to, templateId) =>
                sender.sendTemplate(to, { templateId, type: "text" }, { event: `order_update:${event}`, orderId: order.id }),
            logOutbound,
        });
    } catch (e) {
        console.error("[whatsapp] order update failed", { event, err: String(e) });
        return "failed";
    }
}
