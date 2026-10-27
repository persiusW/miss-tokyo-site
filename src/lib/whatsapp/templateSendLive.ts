// The live side of WhatsApp notices: settings, the customer's conversation
// (opened if they have none, so the notice shows in the inbox), and the
// provider. Server-only. Never throws.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAiSettings, type AiSettings } from "@/lib/ai/settings";
import { createChatbotsAfrica } from "@/lib/messaging/chatbotsAfrica";
import type { NotificationMeta } from "@/lib/notificationLog";
import { logOutbound } from "./conversationStore";
import { newOrderChoice, type NewOrderAlert } from "./teamAlerts";
import { sendNotice, sendTeamTemplate, type Notice, type NoticeConversation, type NoticeOutcome, type TemplateChoice } from "./templateSend";

const db = supabaseAdmin as any;

export async function conversationFor(phone: string): Promise<NoticeConversation> {
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

/** A notice to a customer (refund, payment link, wholesale…), when WhatsApp is on. */
export async function notifyCustomerOnWhatsApp(notice: Notice, meta: NotificationMeta, settings?: AiSettings): Promise<NoticeOutcome | "off"> {
    try {
        const s = settings ?? await getAiSettings();
        if (!s.whatsappEnabled) return "off";
        const sender = createChatbotsAfrica();
        return await sendNotice(notice, {
            templateIdFor: key => s.whatsappTemplateIds[key] ?? null,
            conversationFor,
            sendText: (to, text) => sender.sendText(to, text, meta),
            sendTemplate: (to, templateId, placeholders) => sender.sendTemplate(to, { templateId, type: "text", placeholders }, meta),
            logOutbound,
        });
    } catch (e) {
        console.error("[whatsapp] customer notice failed", { event: meta.event, err: String(e) });
        return "failed";
    }
}

/** A template to staff, a rider or an invitee, when WhatsApp is on and the template has an id. Returns how many it reached. */
export async function notifyTeamOnWhatsApp(numbers: readonly (string | null | undefined)[], choice: TemplateChoice, meta: NotificationMeta, settings?: AiSettings): Promise<number> {
    try {
        const s = settings ?? await getAiSettings();
        if (!s.whatsappEnabled) return 0;
        const sender = createChatbotsAfrica();
        return await sendTeamTemplate(numbers, choice, {
            templateIdFor: key => s.whatsappTemplateIds[key] ?? null,
            sendTemplate: (to, templateId, placeholders) => sender.sendTemplate(to, { templateId, type: "text", placeholders }, meta),
        });
    } catch (e) {
        console.error("[whatsapp] team notice failed", { event: meta.event, err: String(e) });
        return 0;
    }
}

/** The staff alert numbers hear about a new paid order, read from the order itself. */
export async function notifyStaffNewOrder(orderId: string): Promise<number> {
    try {
        const s = await getAiSettings();
        if (!s.whatsappEnabled || !s.staffAlertNumbers.length || !s.whatsappTemplateIds.team_new_order) return 0;
        const { data: o, error } = await db.from("orders")
            .select("id, customer_name, customer_email, total_amount, source, delivery_method, shipping_address").eq("id", orderId).maybeSingle();
        if (error || !o) return 0;
        const addr = (o.shipping_address ?? {}) as { region?: string | null; city?: string | null; text?: string | null };
        const alert: NewOrderAlert = {
            id: o.id, customer: o.customer_name || o.customer_email, total: Number(o.total_amount) || 0,
            channel: o.source === "pos" ? "till" : o.source === "whatsapp" ? "whatsapp" : "online",
            pickup: String(o.delivery_method ?? "").toLowerCase().includes("pickup"),
            area: addr.region || addr.city || addr.text,
        };
        return await notifyTeamOnWhatsApp(s.staffAlertNumbers, newOrderChoice(alert), { event: "wa_team_new_order", orderId: o.id }, s);
    } catch (e) {
        console.error("[whatsapp] new order alert failed", { err: String(e) });
        return 0;
    }
}
