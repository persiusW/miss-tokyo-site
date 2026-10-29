// Order updates on WhatsApp, at the same moments the shop sends SMS: paid,
// packed, on its way, ready for pickup, delivered, cancelled. Paying means
// agreeing to the terms, which include WhatsApp notifications (owner,
// 2026-10-14); a customer who replies STOP gets none.
//
// WhatsApp lets a business message first only inside 24 hours of the
// customer's last message; after that only an approved template goes. So:
// inside the window a plain text; outside it the template with the order's
// details (whatsapp_template_ids, whatsapp/templates), else the general
// order_status_update_v4, else that status's variable-free template
// (whatsapp_status_template_ids), and with none nothing (the SMS still goes).
// Never throws: an update must not stop a status change.
import type { MessagingResult, TemplateId } from "@/lib/messaging/provider";
import { sendNotice, type TemplateChoice } from "./templateSend";
import { firstNameOf, readableNumber, type TemplateKey } from "./templates";

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
export type UpdateExtra = {
    rider?: { name: string; phone?: string | null } | null;
    store?: string | null;
    /** A mixed order's first dispatch: the in-stock items go now, the pre-order items later. */
    partShipped?: boolean;
};

/** The status and next step for an update, for the text sent inside the window. */
export function updateWording(event: OrderEvent, order: UpdateOrder, extra: UpdateExtra = {}): { status: string; next: string } {
    const pickup = order.delivery_method === "pickup";
    switch (event) {
        case "paid": return { status: "confirmed and paid", next: pickup ? "We'll message you when it's ready for pickup." : "We'll message you when it's on its way." };
        case "packed": return { status: "packed", next: pickup ? "We'll message you when it's ready for pickup." : "It will be on its way to you soon." };
        case "shipped": return {
            status: "on its way",
            next: (extra.rider?.name ? `Your rider ${extra.rider.name} will contact you${extra.rider.phone ? ` on ${extra.rider.phone}` : ""}.` : "It's on its way to you now.")
                + (extra.partShipped ? " These are your in-stock items; your pre-order items will follow in a separate delivery." : ""),
        };
        case "ready_for_pickup": return { status: "ready for pickup", next: `You can collect it from our store${extra.store ? ` at ${oneLine(extra.store)}` : ""}.` };
        case "fulfilled": return { status: "delivered", next: "We hope you love it. Thank you for shopping with Miss Tokyo!" };
        case "cancelled": return { status: "cancelled", next: "If you have any questions, just reply to this message." };
    }
}

const firstName = (o: UpdateOrder) => firstNameOf(o.customer_name);
const oneLine = (s: string) => s.replace(/\s*\n\s*/g, ", ").trim();
export const orderRef = (o: UpdateOrder) => o.id.slice(0, 8).toUpperCase();

/** The plain text sent inside the 24-hour window. */
export function updateText(event: OrderEvent, order: UpdateOrder, extra: UpdateExtra = {}): string {
    const w = updateWording(event, order, extra);
    return `Hi ${firstName(order)}, your Miss Tokyo order ${orderRef(order)} is ${w.status}. ${w.next}`;
}

/** The templates with variables for an update, best first; the general status template is always last. */
export function orderTemplates(event: OrderEvent, order: UpdateOrder, extra: UpdateExtra = {}): TemplateChoice[] {
    const first = firstName(order), ref = orderRef(order);
    const status: TemplateChoice = { key: "order_status", values: [first, ref, updateWording(event, order, extra).status] };
    const own = (key: TemplateKey, ...more: unknown[]): TemplateChoice => ({ key, values: [first, ref, ...more] });
    switch (event) {
        case "paid": return [own("order_confirmed"), status];
        case "shipped": {
            const r = extra.rider;
            if (!r?.name || !readableNumber(r.phone)) return [status];
            return [own(extra.partShipped ? "order_part_shipped" : "order_on_its_way", r.name, readableNumber(r.phone)), status];
        }
        case "ready_for_pickup": return extra.store?.trim() ? [own("order_ready_for_pickup", oneLine(extra.store)), status] : [status];
        default: return [status];
    }
}

export type UpdateConversation = { id: string; optedOut: boolean; lastInboundAt: string | null };
export type UpdateDeps = {
    enabled: boolean;                 // whatsapp_enabled and whatsapp_status_notifications
    /** The variable-free template for a status, or null when it has none. */
    templateIdFor: (event: OrderEvent) => TemplateId | null;
    /** An approved template with variables, by key (whatsapp_template_ids); absent = none. */
    variableTemplateIdFor?: (key: TemplateKey) => TemplateId | null;
    conversationFor: (phone: string) => Promise<UpdateConversation>;
    sendText: (to: string, text: string) => Promise<MessagingResult>;
    sendTemplate: (to: string, templateId: TemplateId, placeholders?: string[]) => Promise<MessagingResult>;
    logOutbound: (conversationId: string, text: string, waMessageId: string | null, type?: string) => Promise<void>;
    now?: () => number;
};
export type UpdateOutcome = "off" | "no_phone" | "opted_out" | "no_template" | "sent_text" | "sent_template" | "failed";

export async function sendOrderUpdate(order: UpdateOrder, event: OrderEvent, extra: UpdateExtra, deps: UpdateDeps): Promise<UpdateOutcome> {
    if (!deps.enabled) return "off";
    return sendNotice({
        phone: order.customer_phone,
        freeText: updateText(event, order, extra),
        templates: orderTemplates(event, order, extra),
        // The variable-free template can't name the order, so the log does: staff see it, and the assistant reads it if they reply.
        legacy: { templateId: deps.templateIdFor(event), text: STATUS_TEMPLATES[event].text },
        tag: `[order ${orderRef(order)}]`,
    }, {
        templateIdFor: deps.variableTemplateIdFor ?? (() => null),
        conversationFor: deps.conversationFor,
        sendText: deps.sendText,
        sendTemplate: deps.sendTemplate,
        logOutbound: deps.logOutbound,
        now: deps.now,
    });
}
