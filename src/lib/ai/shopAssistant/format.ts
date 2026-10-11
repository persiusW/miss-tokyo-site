// Pure shaping of tool output for customers: stock as words, orders without
// private fields, the WhatsApp hand-off. Nothing here reads the database.
import type { Stock } from "@/lib/ai/catalogStock";
import type { CartLine, ShopButton } from "./types";
import { BUTTON_LABELS } from "./lines";

export const LOW_STOCK_MAX = 3;

export function stockWord(available: number): string {
    if (!(available > 0)) return "Sold out";
    return available <= LOW_STOCK_MAX ? `Only ${Math.floor(available)} left` : "In stock";
}

export type ProductRow = {
    id: string; name: string | null; slug: string; price_ghs: number | null; is_sale: boolean | null; discount_value: number | null;
    image_urls: string[] | null; available_sizes: string[] | null; available_colors: string[] | null; available_brands: string[] | null;
};

const salePrice = (p: ProductRow) => {
    const price = Number(p.price_ghs) || 0;
    const onSale = !!p.is_sale && Number(p.discount_value) > 0;
    return { price: onSale ? parseFloat((price * (1 - Number(p.discount_value) / 100)).toFixed(2)) : price, was: onSale ? price : null };
};

export type PublicOption = { size: string | null; colour: string | null; brand: string | null; stock: string };

export function publicProduct(p: ProductRow, stock: Stock | undefined, takesPreorders: boolean) {
    const { price, was } = salePrice(p);
    const options: PublicOption[] | undefined = stock?.tracked === "per_option"
        ? (stock.options ?? []).map(o => ({ size: o.size, colour: o.colour, brand: o.brand, stock: stockWord(o.available) }))
        : undefined;
    return {
        product_id: p.id,
        name: String(p.name ?? "").trim(),
        price_ghs: price,
        ...(was !== null ? { was_ghs: was } : {}),
        url: `/products/${p.slug}`,
        image: Array.isArray(p.image_urls) && p.image_urls[0] ? p.image_urls[0] : null,
        sizes: p.available_sizes ?? [],
        colours: p.available_colors ?? [],
        brands: p.available_brands ?? [],
        ...(options ? { options } : { stock: stock?.tracked === "product" ? stockWord(stock.available ?? 0) : "In stock" }),
        takes_preorders: takesPreorders,
    };
}

/** One cart line for an option, keyed like the checkout keys its lines. */
export function cartLineFor(p: ProductRow, o: { size: string | null; colour: string | null; brand: string | null }, isPreOrder: boolean): CartLine {
    const size = o.size ?? "";
    return {
        id: [p.id, size, o.colour ?? "", o.brand ?? ""].join("-"),
        productId: p.id,
        name: String(p.name ?? "").trim(),
        slug: p.slug,
        price: salePrice(p).price,
        size,
        ...(o.colour ? { color: o.colour } : {}),
        ...(o.brand ? { brand: o.brand } : {}),
        quantity: 1,
        imageUrl: Array.isArray(p.image_urls) ? p.image_urls[0] ?? "" : "",
        isPreOrder,
    };
}

export type OrderRow = {
    id: string; created_at: string; total_amount: number | null; status: string;
    payment_status: string | null; items: unknown; delivery_method: string | null;
};

export function paymentState(r: { status: string; payment_status: string | null }): "paid" | "waiting" | "cancelled" | "refunded" {
    if (r.payment_status === "refunded" || r.status === "refunded") return "refunded";
    if (r.payment_status === "paid") return "paid";
    if (r.payment_status === "cancelled" || ["cancelled", "failed", "reservation_expired"].includes(r.status)) return "cancelled";
    return "waiting";
}

export function progressWords(status: string, pickup: boolean): string {
    switch (status) {
        case "pending": return "Waiting for payment";
        case "paid":
        case "processing": return "Being prepared";
        case "packed": return "Packed";
        case "shipped": return "On the way";
        case "ready_for_pickup": return "Ready for pickup";
        case "delivered":
        case "fulfilled": return pickup ? "Collected" : "Delivered";
        case "refunded": return "Refunded";
        default: return "Cancelled";
    }
}

export function publicOrder(r: OrderRow) {
    const pickup = String(r.delivery_method ?? "").toLowerCase().includes("pickup");
    const items = (Array.isArray(r.items) ? r.items : []).slice(0, 20).map((i: any) => ({
        name: String(i?.name ?? i?.productName ?? "Item"),
        size: i?.size ? String(i.size) : null,
        colour: i?.color ? String(i.color) : i?.colour ? String(i.colour) : null,
        quantity: Number(i?.quantity ?? i?.qty ?? 1) || 1,
    }));
    return {
        ref: r.id.slice(0, 8).toUpperCase(),
        date: String(r.created_at).slice(0, 10),
        items,
        total_ghs: Number(r.total_amount) || 0,
        payment: paymentState(r),
        progress: progressWords(r.status, pickup),
        fulfilment: pickup ? "pickup" : "delivery",
    };
}

/** The text pre-typed into WhatsApp. Server-written; never an email, address or long number. */
export function waSummary(a: { topic: string | null; orderRef: string | null }): string {
    const topic = String(a.topic ?? "")
        .replace(/\S+@\S+/g, "")
        .replace(/\d{5,}/g, "")
        .replace(/\b\d+\s+\w+\s+(st|street|rd|road|ave|avenue|close|lane)\b/gi, "")
        .replace(/\s+/g, " ").trim().slice(0, 60);
    let s = "Hi Miss Tokyo, I was chatting with Ask Miss Tokyo on the website";
    s += topic ? ` about ${topic}.` : ".";
    if (a.orderRef && /^[A-F0-9]{8}$/.test(a.orderRef)) s += ` My order is ${a.orderRef}.`;
    return s.slice(0, 300);
}

export function talkButton(number: string | null, summary: string): ShopButton | null {
    if (!number) return null;
    return { kind: "talk_to_us", label: BUTTON_LABELS.talk, href: `https://wa.me/${number}?text=${encodeURIComponent(summary)}` };
}

export function dedupeButtons(buttons: ShopButton[], max = 4): ShopButton[] {
    const seen = new Set<string>();
    const out: ShopButton[] = [];
    for (const b of buttons) {
        const key = b.kind === "add_to_cart" ? `add:${b.item.id}` : `${b.kind}:${b.href}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(b);
        if (out.length === max) break;
    }
    return out;
}
