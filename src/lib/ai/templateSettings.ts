// WhatsApp template ids in AI settings: what a valid one looks like. Pure, so
// the settings validators can be unit-tested without a database.
import { normaliseWaNumber } from "@/lib/ai/shopAssistant/settingsRules";
import { TEMPLATE_KEYS } from "@/lib/whatsapp/templates";
import { isTemplateId } from "@/lib/messaging/provider";

/** Order statuses with their own WhatsApp template (the same list as ORDER_EVENTS in whatsapp/orderUpdates). */
export const STATUS_TEMPLATE_EVENTS = ["paid", "packed", "shipped", "ready_for_pickup", "fulfilled", "cancelled"] as const;
export type StatusTemplateEvent = (typeof STATUS_TEMPLATE_EVENTS)[number];

/** "" or a template id as Chatbots Africa shows it (digits, up to 17 and beyond: kept as text). */
export const templateIdValue = (v: unknown): boolean => v === "" || isTemplateId(v);

/** { paid: "123…", packed: "", … }: only known statuses, each "" or an id. */
export const statusTemplateIdsValue = (v: unknown): boolean =>
    !!v && typeof v === "object" && !Array.isArray(v)
    && Object.entries(v as Record<string, unknown>).every(([k, id]) => (STATUS_TEMPLATE_EVENTS as readonly string[]).includes(k) && templateIdValue(id));

/** How AI Settings labels each status's template field, with the template's name in Chatbots Africa. */
export const STATUS_TEMPLATE_FIELDS: Record<StatusTemplateEvent, { label: string; name: string }> = {
    paid: { label: "Paid", name: "order_payment_received" },
    packed: { label: "Packed", name: "order_packed" },
    shipped: { label: "On its way", name: "order_on_its_way" },
    ready_for_pickup: { label: "Ready for pickup", name: "order_ready_for_pickup" },
    fulfilled: { label: "Delivered", name: "order_delivered" },
    cancelled: { label: "Cancelled", name: "order_cancelled" },
};

/** { order_confirmed: "123…", … }: only known template keys (whatsapp/templates), each "" or an id. */
export const templateIdsValue = (v: unknown): boolean =>
    !!v && typeof v === "object" && !Array.isArray(v)
    && Object.entries(v as Record<string, unknown>).every(([k, id]) => (TEMPLATE_KEYS as readonly string[]).includes(k) && templateIdValue(id));

/** Up to MAX_STAFF_ALERT_NUMBERS Ghana WhatsApp numbers for new-order alerts, each stored as 233…, no repeats. */
export const MAX_STAFF_ALERT_NUMBERS = 5;
export function staffNumbersValue(v: unknown): boolean {
    return Array.isArray(v) && v.length <= MAX_STAFF_ALERT_NUMBERS && v.every(n => typeof n === "string" && normaliseWaNumber(n) === n)
        && new Set(v).size === v.length;
}
