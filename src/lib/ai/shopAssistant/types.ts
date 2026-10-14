// Shapes shared by the shop assistant's engine, tools, route and widget.
import type Anthropic from "@anthropic-ai/sdk";

export type ShopChannel = "web" | "whatsapp";
/** Who is chatting. customerId only for a signed-in non-staff account; WhatsApp adds a Meta-verified phone later. */
export type ShopIdentity = { customerId: string | null; phone?: string | null };
export type QuoteStamp = { key: string; total: number; at: number; turn: number };

/** One shop_chats row, as the engine uses it. */
export type ShopChat = {
    id: string;
    visitorKey: string;
    customerId: string | null;
    /** Exact API messages (thinking blocks included). Server-side only. */
    transcript: Anthropic.MessageParam[];
    verifiedOrders: string[];
    openOrders: string[];
    payLinks: Record<string, string>;
    saleKey: string | null;
    wrongTries: number;
    lastQuote: QuoteStamp | null;
    turns: number;
    /** When the chat last had a message (read from the row; saveChat never writes it from here). */
    lastMessageAt?: string;
};

/** The storefront cart's item shape (src/store/useCart.ts CartItem), minus wholesale fields. */
export type CartLine = {
    id: string; productId: string; name: string; slug: string; price: number;
    size: string; color?: string; brand?: string; quantity: number; imageUrl: string; isPreOrder?: boolean;
};

export type ShopButton =
    | { kind: "open_product"; label: string; href: string; productId?: string; sku?: string }
    | { kind: "add_to_cart"; label: string; item: CartLine }
    | { kind: "pay_now"; label: string; href: string }
    | { kind: "talk_to_us"; label: string; href: string };

export type ShopReply = { reply: string; buttons: ShopButton[] };
