// What a gift card sends on WhatsApp, beside its emails: the card itself to
// whoever will spend it (the buyer for a card they keep, else the recipient),
// and a confirmation to a buyer who sent it to someone else. Only to numbers
// the buyer gave; blank means email only. Pure: notifyCustomerOnWhatsApp sends.
import type { Notice } from "./templateSend";
import { fillTemplate, firstNameOf, ghs, type TemplateKey } from "./templates";

export type GiftCardWhatsApp = {
    /** "self": the buyer keeps it; "email": sent to someone else. */
    mode: string | null | undefined;
    amount: number;
    code: string;
    expiresAt: string | null | undefined;
    senderName: string | null | undefined;
    senderPhone: string | null | undefined;
    recipientName: string | null | undefined;
    recipientPhone: string | null | undefined;
};

const day = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Accra" });

/** "31 Oct 2027", or "never" for a card with no expiry (the template reads "Expiry: never."). */
export function giftExpiry(expiresAt: string | null | undefined): string {
    const t = expiresAt ? new Date(expiresAt) : null;
    return t && !Number.isNaN(t.getTime()) ? day(t) : "never";
}

const notice = (phone: string | null | undefined, key: TemplateKey, values: readonly unknown[]): Notice =>
    ({ phone, freeText: fillTemplate(key, values)?.text ?? null, templates: [{ key, values }] });

const digits = (p: string | null | undefined) => String(p ?? "").replace(/\D/g, "");

/** The notices for one card, at most two. `now` dates the buyer's confirmation: it goes out the moment the card does. */
export function giftCardNotices(g: GiftCardWhatsApp, now: Date): Notice[] {
    const amount = ghs(g.amount);
    const expiry = giftExpiry(g.expiresAt);
    if (g.mode !== "email") {
        return g.senderPhone ? [notice(g.senderPhone, "gift_card_ready", [firstNameOf(g.senderName), amount, g.code, expiry])] : [];
    }
    const out: Notice[] = [];
    if (g.recipientPhone) {
        out.push(notice(g.recipientPhone, "gift_card_from_sender", [firstNameOf(g.recipientName), amount, g.senderName?.trim() || "Miss Tokyo", g.code, expiry]));
    }
    // The buyer's own copy, unless they sent it to their own number.
    if (g.senderPhone && digits(g.senderPhone) !== digits(g.recipientPhone)) {
        out.push(notice(g.senderPhone, "gift_card_sent", [firstNameOf(g.senderName), amount, g.recipientName?.trim() || "your recipient", day(now)]));
    }
    return out;
}
