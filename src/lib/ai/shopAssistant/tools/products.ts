// find_products: active, shop-visible products only, stock as words.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { stockFor } from "@/lib/ai/catalogStock";
import { preorderEligibleIds } from "@/lib/checkout/createCheckoutOrder";
import { normAttr, normSize } from "@/lib/utils/normAttr";
import { cartLineFor, publicProduct, type ProductRow } from "../format";
import { BUTTON_LABELS } from "../lines";
import { err, ok, str, type ShopToolContext, type ToolOutcome } from "./context";

const FIELDS = "id, name, slug, price_ghs, is_sale, discount_value, image_urls, preorder_enabled, track_inventory, track_variant_inventory, available_sizes, available_colors, available_brands, category_id, category_ids, category_type";

/** Safe for PostgREST filters: drops filter syntax and LIKE wildcards. */
const clean = (v: unknown, max = 60) => str(v, max).replace(/[%_,()*"\\:]/g, " ").replace(/\s+/g, " ").trim();

async function findCategory(name: string): Promise<{ id: string; name: string } | null> {
    const q = clean(name);
    if (!q) return null;
    const { data } = await supabaseAdmin.from("categories").select("id, name").ilike("name", `%${q}%`).limit(10);
    const rows = data ?? [];
    return rows.find((c: any) => c.name.toLowerCase() === q.toLowerCase()) ?? rows[0] ?? null;
}

export async function findProducts(input: any, ctx: ShopToolContext): Promise<ToolOutcome> {
    const q = clean(input?.query);
    const catName = str(input?.category, 60);
    if (q.length < 2 && !catName) return err("Ask which product or category they want, e.g. dresses, bags or shoes.");
    ctx.notes.topic = "a product";

    let query = supabaseAdmin.from("products").select(FIELDS).eq("is_active", true).eq("is_wholesale_only", false);
    if (q.length >= 2) query = query.ilike("name", `%${q}%`);
    if (catName) {
        const cat = await findCategory(catName);
        if (!cat) return ok({ products: [], note: `The shop has no "${clean(catName)}" category.` });
        // cat.name is trusted DB data; quote it so commas, parentheses and wildcards cannot break the filter.
        const typeName = cat.name.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        query = query.or(`category_id.eq.${cat.id},category_ids.cs.{"${cat.id}"},category_type.ilike."${typeName}"`);
    }
    const { data, error } = await query.order("created_at", { ascending: false }).limit(12);
    if (error) throw error;
    const rows = (data ?? []) as (ProductRow & Record<string, unknown>)[];
    if (rows.length === 0) return ok({ products: [], note: "Nothing in the shop matches that." });

    const [stock, preorder] = await Promise.all([stockFor(rows), preorderEligibleIds(rows)]);
    const size = str(input?.size, 40), colour = str(input?.colour, 60);
    const max = typeof input?.max_price_ghs === "number" && input.max_price_ghs > 0 ? input.max_price_ghs : Infinity;

    const products = rows
        .map(p => {
            const base = publicProduct(p, stock.get(p.id), preorder.has(p.id));
            // Narrow to the asked-for option without mutating the shaped product.
            const out = "options" in base && base.options && (size || colour)
                ? { ...base, options: base.options.filter(o => (!size || normSize(o.size) === normSize(size)) && (!colour || normAttr(o.colour) === normAttr(colour))) }
                : base;
            return { row: p, out };
        })
        .filter(x => x.out.price_ghs <= max)
        .slice(0, 6);

    for (const { out } of products.slice(0, 2)) ctx.buttons.push({ kind: "open_product", label: `${BUTTON_LABELS.open} ${out.name}`.slice(0, 40), href: out.url });

    // One product, one exact in-stock option: offer to add it to the bag.
    if (products.length === 1 && (size || colour)) {
        const { row, out } = products[0];
        const opts = ("options" in out ? out.options : undefined) ?? [];
        const needs = { size: (row.available_sizes ?? []).length > 0, colour: (row.available_colors ?? []).length > 0, brand: (row.available_brands ?? []).length > 0 };
        if (opts.length === 1 && opts[0].stock !== "Sold out" && !needs.brand
            && (!needs.size || (size && opts[0].size && normSize(opts[0].size) === normSize(size)))
            && (!needs.colour || (colour && opts[0].colour && normAttr(opts[0].colour) === normAttr(colour)))) {
            ctx.buttons.push({ kind: "add_to_cart", label: BUTTON_LABELS.add, item: cartLineFor(row, opts[0], false) });
        }
    }

    return ok({ products: products.map(x => x.out), ...(products.length === 0 ? { note: "Nothing at or under that price." } : {}) });
}
