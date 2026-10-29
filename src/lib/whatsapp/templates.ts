// WhatsApp templates WITH variables, one per message the shop sends that can
// land more than 24 hours after the person last wrote. Chatbots Africa now
// submits them with sample values (2026-10-27), so a template can carry the
// order's details instead of "we sent you a text". The words below are exactly
// what is submitted, so the inbox log reads as the customer saw it; change a
// word only together with a new template name. Pure.
//
// Each id is pasted into ai_settings.whatsapp_template_ids ({ key: id }) once
// Meta approves it. A key without an id is never sent: the caller falls back
// to the old variable-free template, or the SMS alone.

export const TEMPLATE_KEYS = [
    "order_confirmed", "order_on_its_way", "order_part_shipped", "order_ready_for_pickup", "order_status",
    "refund_sent", "payment_link", "document_ready", "order_not_paid", "back_in_stock",
    "order_message_waiting", "team_follow_up", "wholesale_approved",
    "gift_card_ready", "gift_card_from_sender", "gift_card_sent",
    "team_chat_handoff", "team_return_request", "team_new_order", "team_invite", "rider_new_delivery",
    "team_wallet_low", "team_ai_budget",
] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export type TemplateSpec = {
    /** The name in Chatbots Africa. */
    name: string;
    /** Who it goes to: a customer, or the shop's own people (staff, riders, invitees). */
    audience: "customer" | "team";
    /** How Tools › WhatsApp labels its id field. */
    label: string;
    body: string;
    /** What fills {{1}}, {{2}}, … in order. */
    vars: readonly string[];
};

const REPLY = "If you have any questions about your order, reply to this message and our team will help you.";
const GIFT_REPLY = "If you have any questions about your gift card, reply to this message and our team will help you.";
const ASK = "If you have any questions, reply to this message and our team will help you.";
const TEAM_CHAT = "Reply to the customer from the chat, not to this message.";

export const WA_TEMPLATES: Record<TemplateKey, TemplateSpec> = {
    order_confirmed: {
        name: "miss_tokyo_order_confirmed", audience: "customer", label: "Order confirmed (paid)",
        body: `Hi {{1}}, your Miss Tokyo order {{2}} has been confirmed and we have received your payment.\n\nWe will message you again when it is on its way or ready for pickup.\n\n${REPLY}`,
        vars: ["first name", "order ref"],
    },
    order_on_its_way: {
        name: "miss_tokyo_order_on_its_way", audience: "customer", label: "On its way, with the rider",
        body: `Hi {{1}}, your Miss Tokyo order {{2}} is on its way to you.\n\nYour rider is {{3}} and they will call you from {{4}} when they arrive.\n\n${REPLY}`,
        vars: ["first name", "order ref", "rider name", "rider phone"],
    },
    order_part_shipped: {
        name: "miss_tokyo_order_part_shipped", audience: "customer", label: "In-stock items on their way (pre-order to follow)",
        body: `Hi {{1}}, the in-stock items from your Miss Tokyo order {{2}} are on their way to you. Your rider is {{3}} and they will call you from {{4}} when they arrive.\n\nYour pre-order items will come in a separate delivery, and we will message you when they are on their way.\n\n${REPLY}`,
        vars: ["first name", "order ref", "rider name", "rider phone"],
    },
    order_ready_for_pickup: {
        name: "miss_tokyo_order_ready_for_pickup", audience: "customer", label: "Ready for pickup, with the address",
        body: `Hi {{1}}, your Miss Tokyo order {{2}} is ready for pickup.\n\nYou can collect it from our store at {{3}}.\n\n${REPLY}`,
        vars: ["first name", "order ref", "store address"],
    },
    // Approved before this list was written. Only its opening words were on
    // hand (2026-10-27); confirm the rest against Chatbots Africa and correct
    // this body, which only the inbox log uses.
    order_status: {
        name: "order_status_update_v4", audience: "customer", label: "Any other order update (packed, delivered, cancelled)",
        body: `Hi {{1}}, update on your Miss Tokyo order {{2}}. Your order is {{3}}.\n\n${REPLY}`,
        vars: ["first name", "order ref", "status"],
    },
    refund_sent: {
        name: "miss_tokyo_refund_sent", audience: "customer", label: "Refund made",
        body: "Hi {{1}}, we have refunded GHS {{2}} for your Miss Tokyo order {{3}}.\n\nIf you paid by card or mobile money, it can take a few working days to show in your account.\n\nIf you have any questions about your refund, reply to this message and our team will help you.",
        vars: ["first name", "amount", "order ref"],
    },
    payment_link: {
        name: "miss_tokyo_payment_link", audience: "customer", label: "Payment link from the till",
        body: `Hi {{1}}, your Miss Tokyo order of GHS {{2}} is ready for payment.\n\nYou can check your items and pay here: https://misstokyo.shop/pay/{{3}}\n\nThis link expires in {{4}} minutes. ${ASK}`,
        vars: ["first name", "amount", "payment page id", "minutes"],
    },
    document_ready: {
        name: "miss_tokyo_document_ready", audience: "customer", label: "Invoice, quote or payment link",
        body: `Hi {{1}}, your Miss Tokyo {{2}} for GHS {{3}} is ready.\n\nYou can view it here: https://misstokyo.shop/invoice/{{4}}\n\n${ASK}`,
        vars: ["first name", "kind", "amount", "document id"],
    },
    order_not_paid: {
        name: "miss_tokyo_order_not_paid", audience: "customer", label: "WhatsApp order not paid",
        body: "Hi {{1}}, your Miss Tokyo order {{2}} was not paid, so we have released the items.\n\nIf you would still like them, reply to this message and we will check they are available and send you a new payment link.",
        vars: ["first name", "order ref"],
    },
    back_in_stock: {
        name: "miss_tokyo_back_in_stock", audience: "customer", label: "Back in stock",
        body: "Hi {{1}}, you asked us to let you know when {{2}} was back at Miss Tokyo. It is back in stock now.\n\nYou can see it here: https://misstokyo.shop/products/{{3}}\n\nIf you would like to order it, reply to this message and our team will help you.",
        vars: ["first name", "piece", "product slug"],
    },
    order_message_waiting: {
        name: "miss_tokyo_order_message_waiting", audience: "customer", label: "A note from the team about an order",
        body: "Hi {{1}}, the Miss Tokyo team has a message for you about your order {{2}}.\n\nReply to this message and we will send it to you here.",
        vars: ["first name", "order ref"],
    },
    team_follow_up: {
        name: "miss_tokyo_team_follow_up", audience: "customer", label: "Team follow-up on an old chat",
        body: "Hi {{1}}, this is the Miss Tokyo team. We are sorry we could not reply sooner to your message.\n\nReply to this message and we will continue the conversation here.",
        vars: ["first name"],
    },
    wholesale_approved: {
        name: "miss_tokyo_wholesale_approved", audience: "customer", label: "Wholesale approved",
        body: `Hi {{1}}, your Miss Tokyo account has been approved for wholesale prices.\n\nSign in at https://misstokyo.shop/account to see your wholesale prices.\n\n${ASK}`,
        vars: ["first name"],
    },
    gift_card_ready: {
        name: "miss_tokyo_gift_card_ready", audience: "customer", label: "Gift card ready",
        body: `Hi {{1}}, your Miss Tokyo gift card worth GHS {{2}} is ready to use.\n\nYour gift card code is {{3}}. Enter it at checkout on https://misstokyo.shop to pay with it. Expiry: {{4}}.\n\n${GIFT_REPLY}`,
        vars: ["first name", "amount", "code", "expiry"],
    },
    gift_card_from_sender: {
        name: "miss_tokyo_gift_card_from_sender", audience: "customer", label: "Gift card received from someone",
        body: `Hi {{1}}, you have received a Miss Tokyo gift card worth GHS {{2}} from {{3}}.\n\nYour gift card code is {{4}}. Enter it at checkout on https://misstokyo.shop to pay with it. Expiry: {{5}}.\n\n${GIFT_REPLY}`,
        vars: ["first name", "amount", "sender", "code", "expiry"],
    },
    gift_card_sent: {
        name: "miss_tokyo_gift_card_sent", audience: "customer", label: "Gift card sent (to the buyer)",
        body: `Hi {{1}}, your Miss Tokyo gift card worth GHS {{2}} has been sent to {{3}} on {{4}}.\n\n${GIFT_REPLY}`,
        vars: ["first name", "amount", "recipient", "date"],
    },
    team_chat_handoff: {
        name: "miss_tokyo_team_chat_handoff", audience: "team", label: "Chat needs a person",
        body: `Miss Tokyo WhatsApp: a customer needs a person.\n\nCustomer: {{1}}\nTheir number: {{2}}\nReason: they {{3}}.\n\nOpen the chat: https://misstokyo.shop/customers/whatsapp?c={{4}}\n\n${TEAM_CHAT}`,
        vars: ["customer", "number", "reason", "chat id"],
    },
    team_return_request: {
        name: "miss_tokyo_team_return_request", audience: "team", label: "Return or exchange request",
        body: `Miss Tokyo WhatsApp: a customer has asked to return or exchange an order.\n\nCustomer: {{1}}\nTheir number: {{2}}\nOrder: {{3}}\nReason: {{4}}\nThey would like: {{5}}\n\nOpen the chat: https://misstokyo.shop/customers/whatsapp?c={{6}}\n\n${TEAM_CHAT}`,
        vars: ["customer", "number", "order ref", "reason", "wants", "chat id"],
    },
    team_new_order: {
        name: "miss_tokyo_team_new_order", audience: "team", label: "New paid order",
        body: "Miss Tokyo: a new order has been paid.\n\nOrder: {{1}}\nCustomer: {{2}}\nTotal: GHS {{3}}\nPlaced through: {{4}}\nDelivery: {{5}}\n\nOpen the order: https://misstokyo.shop/orders/{{6}}\n\nNo reply is needed.",
        vars: ["order ref", "customer", "total", "channel", "delivery", "order id"],
    },
    team_invite: {
        name: "miss_tokyo_team_invite", audience: "team", label: "Staff invitation",
        body: "Hi {{1}}, you have been invited to join the Miss Tokyo team as {{2}}.\n\nAccept your invitation here: https://misstokyo.shop/invite?token={{3}}\n\nThis link is for you only, so please do not share it. If you have any questions, ask the person who invited you.",
        vars: ["first name", "role", "invite token"],
    },
    rider_new_delivery: {
        name: "miss_tokyo_rider_new_delivery", audience: "team", label: "New deliveries (to the rider)",
        body: "Hi {{1}}, Miss Tokyo has new deliveries for you.\n\nNumber of orders: {{2}}\nDeliveries: {{3}}\n\nPlease call the shop for the full details before you set off.",
        vars: ["rider first name", "count", "deliveries"],
    },
    team_wallet_low: {
        name: "miss_tokyo_team_wallet_low", audience: "team", label: "WhatsApp wallet low",
        body: "Miss Tokyo WhatsApp: the messaging wallet is low. The balance is GHS {{1}} and the alert level is GHS {{2}}.\n\nWhen it runs out, WhatsApp replies and order updates to customers stop. Please top it up today.\n\nNo reply is needed.",
        vars: ["balance", "alert level"],
    },
    team_ai_budget: {
        name: "miss_tokyo_team_ai_budget", audience: "team", label: "AI budget at 80% or 100%",
        body: "Miss Tokyo AI: today's assistant spend has reached {{1}} percent of the daily limit (GHS {{2}} of GHS {{3}}).\n\nAt the limit, the shop assistant and WhatsApp replies pause until midnight and chats go to the team. You can raise the limit in Settings, AI.\n\nNo reply is needed.",
        vars: ["percent", "spent", "limit"],
    },
};

/** Longest value we put in a variable; Meta's limit is far higher, a message should not be. */
export const MAX_VALUE = 300;

/**
 * A value as WhatsApp accepts it in a variable: one line (Meta rejects new
 * lines, tabs and runs of spaces in parameters), trimmed and capped.
 */
export function templateValue(v: unknown): string {
    return String(v ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_VALUE).trim();
}

export type FilledTemplate = { placeholders: string[]; text: string };

/** The placeholders and the words the person sees, or null when a value is missing (Meta rejects an empty variable). */
export function fillTemplate(key: TemplateKey, values: readonly unknown[]): FilledTemplate | null {
    const spec = WA_TEMPLATES[key];
    const placeholders = values.map(templateValue);
    if (placeholders.length !== spec.vars.length || placeholders.some(p => !p)) return null;
    const text = spec.body.replace(/\{\{(\d+)\}\}/g, (_m, n: string) => placeholders[Number(n) - 1] ?? "");
    return { placeholders, text };
}

/** "Ama" from "Ama Mensah"; "there" when there is no name. */
export function firstNameOf(name: string | null | undefined): string {
    return String(name ?? "").trim().split(/\s+/)[0] || "there";
}

/** "0244123456" for a Ghana number, else "+<digits>": how people read a number. */
export function readableNumber(phone: string | null | undefined): string {
    const d = String(phone ?? "").replace(/\D/g, "");
    if (/^233\d{9}$/.test(d)) return `0${d.slice(3)}`;
    if (/^0\d{9}$/.test(d)) return d;
    return d ? `+${d}` : "";
}

/** "450.00" for GHS amounts in a template. */
export const ghs = (n: number | string | null | undefined) => {
    const v = Number(n);
    return Number.isFinite(v) ? v.toFixed(2) : "";
};

/** Templates written and submitted but not sent by the code yet, with what is missing. */
export const NOT_SENT_YET: Partial<Record<TemplateKey, string>> = {};
