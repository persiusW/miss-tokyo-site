// The messages Settings › Messages to customers can edit, and where each one
// is stored: email and SMS wording in communication_templates (event_type),
// the WhatsApp template id in ai_settings.whatsapp_status_template_ids.
// Same events as the old Emails tab, plus the WhatsApp-only Packed update.
import type { StatusTemplateEvent } from "@/lib/ai/templateSettings";

export type MessageEvent = {
    key: string;
    label: string;
    when: string;
    /** communication_templates.event_type for each channel, when editable. */
    email?: string;
    sms?: string;
    wa?: StatusTemplateEvent;
    /** Wording the system writes itself (not a template). */
    fixed?: string;
    group: "order" | "other";
};

export const MESSAGE_EVENTS: MessageEvent[] = [
    { key: "confirmed", label: "Order confirmed", when: "Sent when the payment goes through.", email: "order_confirmed", sms: "order_confirmed", wa: "paid", group: "order" },
    { key: "packed", label: "Order packed", when: "Sent on WhatsApp when the order is packed.", wa: "packed", group: "order" },
    { key: "shipped", label: "Out for delivery", when: "Sent when a rider is assigned and the order is on its way.", email: "order_shipped", sms: "order_shipped", wa: "shipped", group: "order" },
    { key: "ready", label: "Ready for collection", when: "Sent when a pickup order is ready.", wa: "ready_for_pickup", group: "order",
        fixed: "The email and SMS for this step are written by the system. They use the pickup address, phone, wait time and instructions from Location and pickup." },
    { key: "fulfilled", label: "Delivered", when: "Sent when the order is delivered and marked complete.", email: "order_fulfilled", sms: "order_fulfilled", wa: "fulfilled", group: "order" },
    { key: "cancelled", label: "Order cancelled", when: "Sent if the order is cancelled for any reason.", email: "order_cancelled", sms: "order_cancelled", wa: "cancelled", group: "order" },
    { key: "account_setup", label: "Account set-up", when: "Sent to first-time customers with a link to set a password and track orders.", email: "account_setup", group: "other" },
    { key: "invoice_sent", label: "Invoice sent", when: "Sent when you issue an invoice or quotation.", email: "invoice_sent", group: "other" },
    { key: "wholesale_approved", label: "Wholesale approved", when: "Sent when a customer gets wholesale prices.", email: "wholesale_approved", sms: "wholesale_approved", group: "other" },
    { key: "wholesale_revoked", label: "Wholesale removed", when: "Sent when a customer's wholesale access is removed.", email: "wholesale_revoked", group: "other" },
    { key: "admin_new_order", label: "New order alert to the team", when: "An email to the team when a new order is placed.", email: "admin_new_order", group: "other" },
    { key: "team_invite", label: "Staff invitation", when: "Sent to someone you invite to the admin.", email: "team_invite", sms: "team_invite", group: "other" },
];

export const TEMPLATE_VARS = ["{customer_name}", "{order_id}", "{amount}", "{rider_name}", "{rider_phone}"] as const;

/** Sample values for previews and test sends (the test routes use the same ones). */
export const SAMPLE_VARS: Record<string, string> = {
    "{order_id}": "TEST1234",
    "{customer_name}": "Test Customer",
    "{amount}": "GH₵ 1,200.00",
    "{rider_name}": "Kwame Mensah",
    "{rider_phone}": "+233 20 000 0000",
};

export function withSamples(text: string): string {
    return Object.entries(SAMPLE_VARS).reduce((s, [k, v]) => s.replaceAll(k, v), text);
}

/** "Email · SMS · WhatsApp" for a row's subtitle. */
export function channelsLine(m: MessageEvent): string {
    return [m.email && "Email", m.sms && "SMS", m.fixed && "Email · SMS (set by the system)", m.wa && "WhatsApp"].filter(Boolean).join(" · ");
}

/** SMS credits: 160 characters each. */
export function smsCredits(text: string): number {
    return Math.max(1, Math.ceil(text.length / 160));
}
