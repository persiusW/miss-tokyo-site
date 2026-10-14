// Chat buttons only ever go where the shop sent them. Pure, so tests can import it.
import type { ShopButton, CartLine } from "@/lib/ai/shopAssistant/types";

const str = (v: unknown): v is string => typeof v === "string";

function safeItem(v: unknown): CartLine | null {
    if (!v || typeof v !== "object") return null;
    const x = v as Record<string, unknown>;
    if (!(str(x.id) && str(x.productId) && str(x.name) && str(x.slug) && str(x.size) && str(x.imageUrl))) return null;
    if (typeof x.price !== "number" || !Number.isFinite(x.price) || x.price < 0) return null;
    if (typeof x.quantity !== "number" || !Number.isInteger(x.quantity) || x.quantity < 1 || x.quantity > 20) return null;
    return {
        id: x.id, productId: x.productId, name: x.name, slug: x.slug, price: x.price,
        size: x.size, quantity: x.quantity, imageUrl: x.imageUrl,
        ...(str(x.color) ? { color: x.color } : {}),
        ...(str(x.brand) ? { brand: x.brand } : {}),
        ...(typeof x.isPreOrder === "boolean" ? { isPreOrder: x.isPreOrder } : {}),
    };
}

export function safeButton(b: unknown): ShopButton | null {
    if (!b || typeof b !== "object") return null;
    const x = b as Record<string, unknown>;
    if (!str(x.label)) return null;
    const label = x.label;
    switch (x.kind) {
        case "open_product":
            return str(x.href) && x.href.startsWith("/products/") ? { kind: "open_product", label, href: x.href } : null;
        case "pay_now":
            return str(x.href) && x.href.startsWith("https://checkout.paystack.com/") ? { kind: "pay_now", label, href: x.href } : null;
        case "talk_to_us":
            return str(x.href) && x.href.startsWith("https://wa.me/") ? { kind: "talk_to_us", label, href: x.href } : null;
        case "add_to_cart": {
            const item = safeItem(x.item);
            return item ? { kind: "add_to_cart", label, item } : null;
        }
        default:
            return null;
    }
}

export function safeButtons(v: unknown): ShopButton[] {
    return Array.isArray(v) ? v.map(safeButton).filter((b): b is ShopButton => b !== null) : [];
}
