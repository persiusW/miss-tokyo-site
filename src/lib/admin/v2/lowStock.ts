// Low stock per size and colour (BACKEND_GAPS 8). Pure. The database applies
// the same rules in fn_low_stock_variants() (migration
// 20261022041000_low_stock_per_variant); these tests pin them, and Products ›
// Inventory should count with the same function so the numbers agree.
import { plural } from "@/components/admin/ui/format";

/** inventory_count 9999 means "not tracked" (lib/inventory.ts). */
export const NOT_TRACKED = 9999;
export const DEFAULT_LOW_AT = 2;

export type StockProduct = {
    is_active: boolean | null;
    track_inventory: boolean | null;
    track_variant_inventory: boolean | null;
    preorder_enabled: boolean | null;
    inventory_count: number | null;
    low_stock_at?: number | null;
};
export type StockVariant = { inventory_count: number | null; visible?: boolean | null };

/** Products whose stock Home watches: active, tracked, not taking pre-orders. */
export function watchesStock(p: StockProduct): boolean {
    return p.is_active === true && p.track_inventory !== false && p.preorder_enabled !== true;
}

export function isLow(count: number | null, lowAt: number | null | undefined): boolean {
    const n = count ?? 0;
    return n !== NOT_TRACKED && n <= (lowAt ?? DEFAULT_LOW_AT);
}

/**
 * The low or sold-out rows of one product. A variant-tracked product is
 * checked per visible size/colour row, never by its roll-up; a product without
 * variant tracking has one stock figure, so it is one row (variant null).
 */
export function lowRows<V extends StockVariant>(p: StockProduct, variants: V[]): { variant: V | null; count: number }[] {
    if (!watchesStock(p)) return [];
    if (p.track_variant_inventory) {
        return variants.filter(v => v.visible !== false && isLow(v.inventory_count, p.low_stock_at))
            .map(v => ({ variant: v, count: v.inventory_count ?? 0 }));
    }
    return isLow(p.inventory_count, p.low_stock_at) ? [{ variant: null, count: p.inventory_count ?? 0 }] : [];
}

export type LowRow = { product_name: string; size: string | null; color: string | null; brand: string | null; inventory_count: number; low_stock_at: number };

/** "Pink Off Shoulder Dress in M / Pink". */
export function optionName(r: Pick<LowRow, "product_name" | "size" | "color" | "brand">): string {
    const opt = [r.size, r.color, r.brand].map(x => (x ?? "").trim()).filter(Boolean).join(" / ");
    return opt ? `${r.product_name.trim()} in ${opt}` : r.product_name.trim();
}

/** The sentence under "N sizes are low or sold out". */
export function lowStockText(total: number, soldOut: number, levels: number[], example: LowRow | null): string {
    const uniq = [...new Set(levels)];
    const level = uniq.length === 1 ? `${uniq[0]} or fewer` : "each product's warning level";
    const parts = [`Counted per size and colour, at ${level}.`];
    if (soldOut > 0 && soldOut < total) parts.push(`${plural(soldOut, "is", "are")} sold out.`);
    else if (total > 1 && soldOut === total) parts.push("All of them are sold out.");
    if (example) parts.push(`${optionName(example)} ${example.inventory_count <= 0 ? "is sold out" : `has ${example.inventory_count} left`}.`);
    return parts.join(" ");
}
