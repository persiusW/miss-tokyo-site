// Order updates on WhatsApp, at the same moments the shop sends SMS: paid,
// packed, on its way, ready for pickup, delivered, cancelled. Paying means
// agreeing to the terms, which include WhatsApp notifications (owner,
// 2026-10-14); a customer who replies STOP gets none.
//
// WhatsApp lets a business message first only inside 24 hours of the
// customer's last message; after that only an approved template goes. So:
// inside the window a plain text, outside it that status's own template
// (whatsapp_status_template_ids), and with none nothing (the SMS still goes).
// Never throws: an update must not stop a status change.
//
// The templates carry no variables. Chatbots Africa's template form can't
// send Meta the sample value each variable needs, so every template with one
// was rejected (order_status_update, order_status_update_v2, 2026-10-16).
import { toDestination } from "@/lib/messaging/chatbotsAfrica";
import type { MessagingResult } from "@/lib/messaging/provider";
import { REPLY_WINDOW_MS } from "./pipeline";
import { NOTICE_TYPE } from "./notices";

export type OrderEvent = "paid" | "packed" | "shipped" | "ready_for_pickup" | "fulfilled" | "cancelled";
export const ORDER_EVENTS: readonly OrderEvent[] = ["paid", "packed", "shipped", "ready_for_pickup", "fulfilled", "cancelled"];

/** The approved templates' words, one per status, exactly as submitted (no variables). */
export const STATUS_TEMPLATES: Record<OrderEvent, { name: string; text: string }> = {
    paid: { name: "order_payment_received", text: "Thank you for shopping with Miss Tokyo. We have received your payment and your order is confirmed.\n\nWe will message you again when it is on its way or ready for pickup." },
    packed: { name: "order_packed", text: "Your Miss Tokyo order has been packed. We will message you again when it is on its way or ready for pickup.\n\nReply to this message if you have any questions." },
    shipped: { name: "order_on_its_way", text: "Your Miss Tokyo order is on its way to you. Our rider will contact you when they arrive.\n\nReply to this message if you have any questions." },
    ready_for_pickup: { name: "order_ready_for_pickup", text: "Your Miss Tokyo order is ready for pickup at our store.\n\nReply to this message if you would like our address or opening hours." },
    fulfilled: { name: "order_delivered", text: "Your Miss Tokyo order has been delivered. We hope you love it, and thank you for shopping with Miss Tokyo.\n\nReply to this message if you have any questions." },
    cancelled: { name: "order_cancelled", text: "Your Miss Tokyo order has been cancelled.\n\nIf you have any questions about this, reply to this message and our team will help you." },
};

export type UpdateOrder = { id: string; customer_name?: string | null; customer_phone?: string | null; delivery_method?: string | null };
export type UpdateExtra = { rider?: { name: string; phone?: string | null } | null; store?: string | null };

/** The status and next step for an update, for the text sent inside the window. */
export function updateWording(event: OrderEvent, order: UpdateOrder, extra: UpdateExtra = {}): { status: string; next: string } {
    const pickup = order.delivery_method === "pickup";
    switch (event) {
        case "paid": return { status: "confirmed and paid", next: pickup ? "We'll message you when it's ready for pickup." : "We'll message you when it's on its way." };
        case "packed": return { status: "packed", next: pickup ? "We'll message you when it's ready for pickup." : "It will be on its way to you soon." };
        case "shipped": return {
            status: "on its way",
            next: extra.rider?.name ? `Your rider ${extra.rider.name} will contact you${extra.rider.phone ? ` on ${extra.rider.phone}` : ""}.` : "It's on its way to you now.",
        };
        case "ready_for_pickup": return { status: "ready for pickup", next: `You can collect it from our store${extra.store ? ` at ${extra.store.replace(/\s*\n\s*/g, ", ")}` : ""}.` };
        case "fulfilled": return { status: "delivered", next: "We hope you love it. Thank you for shopping with Miss Tokyo!" };
        case "cancelled": return { status: "cancelled", next: "If you have any questions, just reply to this message." };
    }
}

const firstName = (o: UpdateOrder) => String(o.customer_name ?? "").trim().split(/\s+/)[0] || "there";
export const orderRef = (o: UpdateOrder) => o.id.slice(0, 8).toUpperCase();

/** The plain text sent inside the 24-hour window. */
export function updateText(event: OrderEvent, order: UpdateOrder, extra: UpdateExtra = {}): string {
    const w = updateWording(event, order, extra);
    return `Hi ${firstName(order)}, your Miss Tokyo order ${orderRef(order)} is ${w.status}. ${w.next}`;
}

export type UpdateConversation = { id: string; optedOut: boolean; lastInboundAt: string | null };
export type UpdateDeps = {
    enabled: boolean;                 // whatsapp_enabled and whatsapp_status_notifications
    /** The approved template for a status, or null when it has none. */
    templateIdFor: (event: OrderEvent) => number | null;
    conversationFor: (phone: string) => Promise<UpdateConversation>;
    sendText: (to: string, text: string) => Promise<MessagingResult>;
    sendTemplate: (to: string, templateId: number) => Promise<MessagingResult>;
    logOutbound: (conversationId: string, text: string, waMessageId: string | null, type?: string) => Promise<void>;
    now?: () => number;
};
export type UpdateOutcome = "off" | "no_phone" | "opted_out" | "no_template" | "sent_text" | "sent_template" | "failed";

export async function sendOrderUpdate(order: UpdateOrder, event: OrderEvent, extra: UpdateExtra, deps: UpdateDeps): Promise<UpdateOutcome> {
    try {
        if (!deps.enabled) return "off";
        const to = toDestination(order.customer_phone ?? "");
        if (!to) return "no_phone";
        const conv = await deps.conversationFor(to);
        if (conv.optedOut) return "opted_out";
        let text = updateText(event, order, extra);
        const now = deps.now?.() ?? Date.now();
        const inWindow = !!conv.lastInboundAt && now - Date.parse(conv.lastInboundAt) < REPLY_WINDOW_MS;
        let r: MessagingResult;
        let outcome: UpdateOutcome;
        if (inWindow) {
            r = await deps.sendText(to, text);
            outcome = "sent_text";
        } else if (deps.templateIdFor(event)) {
            r = await deps.sendTemplate(to, deps.templateIdFor(event)!);
            // The template can't name the order, so the log does: staff see it, and the assistant reads it if they reply.
            text = `${STATUS_TEMPLATES[event].text}\n[order ${orderRef(order)}]`;
            outcome = "sent_template";
        } else {
            return "no_template";
        }
        if (!r.ok) return "failed";
        await deps.logOutbound(conv.id, text, r.messageId, NOTICE_TYPE);
        return outcome;
    } catch (e) {
        console.error("[whatsapp] order update failed", { event, order: order.id.slice(0, 8), err: String(e) });
        return "failed";
    }
}
