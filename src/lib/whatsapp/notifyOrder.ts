// The live side of WhatsApp order updates: settings, the customer's
// conversation and the provider. Server-only. Never throws.
import { getAiSettings } from "@/lib/ai/settings";
import { createChatbotsAfrica } from "@/lib/messaging/chatbotsAfrica";
import { logOutbound } from "./conversationStore";
import { sendOrderUpdate, type OrderEvent, type UpdateExtra, type UpdateOrder, type UpdateOutcome } from "./orderUpdates";
import { conversationFor } from "./templateSendLive";

export async function notifyOrderOnWhatsApp(order: UpdateOrder, event: OrderEvent, extra: UpdateExtra = {}): Promise<UpdateOutcome> {
    try {
        const settings = await getAiSettings();
        const sender = createChatbotsAfrica();
        const meta = { event: `order_update:${event}`, orderId: order.id };
        return await sendOrderUpdate(order, event, extra, {
            enabled: settings.whatsappEnabled && settings.whatsappStatusNotifications,
            templateIdFor: event => settings.whatsappStatusTemplateIds[event] ?? null,
            variableTemplateIdFor: key => settings.whatsappTemplateIds[key] ?? null,
            conversationFor,
            sendText: (to, text) => sender.sendText(to, text, meta),
            sendTemplate: (to, templateId, placeholders) => sender.sendTemplate(to, { templateId, type: "text", placeholders }, meta),
            logOutbound,
        });
    } catch (e) {
        console.error("[whatsapp] order update failed", { event, err: String(e) });
        return "failed";
    }
}
