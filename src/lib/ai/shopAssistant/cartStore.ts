// The assistant's basket (assistant_carts), one per shopper's visitor key.
// A basket idle for a day reads as empty. Server-only (service role).
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isFresh, type CartLine } from "./cartRules";

// assistant_carts is not in the generated types yet.
const db = supabaseAdmin as any;

const clean = (raw: unknown): CartLine[] => (Array.isArray(raw) ? raw : []).filter((l: any) =>
    l && typeof l.product_id === "string" && typeof l.name === "string" && Number.isInteger(l.quantity) && l.quantity > 0) as CartLine[];

export async function loadCart(visitorKey: string): Promise<CartLine[]> {
    const { data, error } = await db.from("assistant_carts").select("items, updated_at").eq("visitor_key", visitorKey).maybeSingle();
    if (error) throw error;
    return data && isFresh(data.updated_at, Date.now()) ? clean(data.items) : [];
}

export async function saveCart(visitorKey: string, lines: CartLine[]): Promise<void> {
    const { error } = await db.from("assistant_carts")
        .upsert({ visitor_key: visitorKey, items: lines, updated_at: new Date().toISOString() }, { onConflict: "visitor_key" });
    if (error) throw error;
}

export const clearCart = (visitorKey: string) => saveCart(visitorKey, []);
