// An invoice or pay link on WhatsApp (template document_ready): the amount and
// a link to /invoice/<id>. Never a quote: that page shows invoices and pay
// links only, so a quote's link would open "not found". Pure.
import type { Notice } from "./templateSend";
import { fillTemplate, firstNameOf, ghs } from "./templates";

export type WhatsAppDocument = { id: string; type: string; amount: number; customer_name: string | null; customer_phone: string | null };

const KIND: Record<string, string> = { invoice: "invoice", pay_link: "payment link" };

/** Whether this kind of document can go on WhatsApp at all. */
export const documentCanWhatsApp = (type: string) => type in KIND;

export function documentNotice(d: WhatsAppDocument): Notice | null {
    const kind = KIND[d.type];
    if (!kind || !d.customer_phone) return null;
    const values = [firstNameOf(d.customer_name), kind, ghs(d.amount), d.id];
    return { phone: d.customer_phone, freeText: fillTemplate("document_ready", values)?.text ?? null, templates: [{ key: "document_ready", values }] };
}
