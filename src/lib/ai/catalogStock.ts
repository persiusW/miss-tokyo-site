// Live stock for many products in one pass, net of holds — shared by Miss
// Tokyo AI's catalogue tools and the shop assistant's find_products.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStockStatus } from "@/lib/inventory";

export type StockOption = { size: string | null; colour: string | null; brand: string | null; available: number };
export type Stock = { tracked: "per_option" | "product" | "not_tracked"; available?: number; options?: StockOption[] };

/** Live stock for many products in one availability lookup. */
export async function stockFor(products: any[], maxOptionsPerProduct = 60): Promise<Map<string, Stock>> {
    const result = new Map<string, Stock>();
    const variantTracked = products.filter(p => p.track_variant_inventory).map(p => p.id);
    const variantsByProduct = new Map<string, any[]>();
    if (variantTracked.length > 0) {
        // Variant rows can exceed PostgREST's default page; fetch in pages.
        for (let from = 0; ; from += 1000) {
            const { data: page, error } = await supabaseAdmin
                .from("product_variants")
                .select("product_id, size, color, brand")
                .in("product_id", variantTracked)
                .order("product_id")
                .range(from, from + 999);
            if (error) throw error;
            for (const v of page ?? []) {
                const list = variantsByProduct.get(v.product_id) ?? [];
                list.push(v);
                variantsByProduct.set(v.product_id, list);
            }
            if (!page || page.length < 1000) break;
        }
    }

    // One getStockStatus call for every line we need.
    const lines: { productId: string; size: string; color?: string; brand?: string; quantity: number; key: string; v?: any }[] = [];
    for (const p of products) {
        if (p.track_variant_inventory) {
            for (const v of (variantsByProduct.get(p.id) ?? []).slice(0, maxOptionsPerProduct)) {
                lines.push({ productId: p.id, size: v.size ?? "", color: v.color ?? undefined, brand: v.brand ?? undefined, quantity: 1, key: p.id, v });
            }
        } else if (p.track_inventory) {
            lines.push({ productId: p.id, size: "", quantity: 1, key: p.id });
        }
    }
    // getStockStatus reads the variant rows of every product it is given in one
    // unpaged query, which PostgREST caps at 1,000 rows. Across the whole
    // catalogue that silently drops variants (they then read as sold out), so
    // call it in product batches well under the cap.
    const statuses: { available: number }[] = new Array(lines.length);
    let start = 0;
    while (start < lines.length) {
        let end = start;
        const products = new Set<string>();
        while (end < lines.length && (end - start < 700 || products.has(lines[end].productId))) {
            products.add(lines[end].productId);
            end++;
        }
        const batch = await getStockStatus(lines.slice(start, end).map(({ key, v, ...rest }) => rest));
        batch.forEach((st, i) => { statuses[start + i] = st; });
        start = end;
    }

    for (const p of products) {
        if (p.track_variant_inventory) result.set(p.id, { tracked: "per_option", options: [] });
        else if (p.track_inventory) result.set(p.id, { tracked: "product", available: 0 });
        else result.set(p.id, { tracked: "not_tracked" });
    }
    lines.forEach((line, i) => {
        const s = result.get(line.key)!;
        const available = Math.max(0, statuses[i]?.available ?? 0);
        if (s.tracked === "per_option") {
            s.options!.push({ size: line.v.size ?? null, colour: line.v.color ?? null, brand: line.v.brand ?? null, available });
        } else {
            s.available = available;
        }
    });
    return result;
}
