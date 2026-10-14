// Turns an Ask Miss Tokyo result into one WhatsApp text. WhatsApp shows plain
// links, so buttons become link lines after the reply. "Talk to us" is not a
// link here: the customer is already on WhatsApp, so it means "hand this chat
// to a person". Pure.
import { LINES } from "@/lib/ai/shopAssistant/lines";
import type { ShopButton } from "@/lib/ai/shopAssistant/types";

export const WA_TEXT_MAX = 4096;

/** Lines for people already on WhatsApp. Each mirrors a website line that sends them to WhatsApp. */
export const WA_LINES = {
    textOnly: "Thanks! I can only read text messages right now. A member of our team will follow up here shortly.",
    handedOff: "A member of our team will continue this chat with you shortly.",
    limit: "We've reached today's chat limit with our assistant. A member of our team will follow up with you here.",
    cantChat: "Our assistant can't chat right now. A member of our team will follow up with you here.",
    trackLocked: "I can't look up more orders in this chat. A member of our team will help you here shortly.",
    refusal: "I can't help with that one. A member of our team can help you here.",
} as const;

const SWAP: Record<string, string> = {
    [LINES.cantChat]: WA_LINES.cantChat,
    [LINES.trackLocked]: WA_LINES.trackLocked,
    [LINES.refusal]: WA_LINES.refusal,
};

export type WhatsAppImage = { url: string; caption: string };
export type WhatsAppReply = { text: string; wantsPerson: boolean; images: WhatsAppImage[] };

/** Product photos sent after a reply, at most this many. */
export const MAX_IMAGES = 2;

function absolute(href: string, siteUrl: string): string {
    return /^https:\/\//i.test(href) ? href : `${siteUrl.replace(/\/+$/, "")}${href.startsWith("/") ? "" : "/"}${href}`;
}

export function renderForWhatsApp(reply: string, buttons: ShopButton[], siteUrl: string): WhatsAppReply {
    const body = SWAP[reply.trim()] ?? reply.trim();
    const links: string[] = [];
    const seen = new Set<string>();
    const add = (label: string, url: string) => { if (!seen.has(url)) { seen.add(url); links.push(`${label}: ${url}`); } };
    let wantsPerson = false;
    const images: WhatsAppImage[] = [];
    for (const b of buttons) {
        // WhatsApp takes jpg/png only; the shop's photos are webp, so they come through our JPEG route.
        if (b.kind === "open_product" && b.productId && images.length < MAX_IMAGES) {
            images.push({ url: `${siteUrl.replace(/\/+$/, "")}/api/whatsapp/media/product/${b.productId}`, caption: `${b.label.replace(/^View /, "")}\n${absolute(b.href, siteUrl)}` });
        }
        if (b.kind === "talk_to_us") { wantsPerson = true; continue; }
        if (b.kind === "pay_now") add("Pay now", b.href);
        else if (b.kind === "open_product") add(b.label, absolute(b.href, siteUrl));
        else if (b.kind === "add_to_cart") add(`View ${b.item.name}`, absolute(`/products/${b.item.slug}`, siteUrl));
    }
    const text = [body, links.join("\n")].filter(Boolean).join("\n\n");
    return { text: text.length > WA_TEXT_MAX ? text.slice(0, WA_TEXT_MAX - 1) + "…" : text, wantsPerson, images };
}
