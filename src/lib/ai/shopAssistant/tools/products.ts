// find_products: active, shop-visible products only, stock as words, and
// never a sold-out piece unless the customer named it (see ../selection).
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { stockFor } from "@/lib/ai/catalogStock";
import { preorderEligibleIds } from "@/lib/checkout/createCheckoutOrder";
import { normAttr } from "@/lib/utils/normAttr";
import { cartLineFor, publicProduct, sizeMatches, type ProductRow } from "../format";
import { BUTTON_LABELS } from "../lines";
import { categoriesOf, inStock, NAMED_MAX, NEAR_SKU, normaliseSku, phraseMatches, pickResults, searchWords, skuDistance, skuMatches, wordScore, type Candidate } from "../selection";
import { err, ok, str, type ShopToolContext, type ToolOutcome } from "./context";

export const PRODUCT_FIELDS = "id, name, slug, sku, price_ghs, is_sale, discount_value, image_urls, preorder_enabled, track_inventory, track_variant_inventory, available_sizes, available_colors, available_brands, category_id, category_ids, category_type";
/** Rows read per search, so pieces in stock are found even when the newest ones are sold out. */
const SEARCH_ROWS = 40;

type Row = ProductRow & Record<string, unknown>;
type Out = ReturnType<typeof publicProduct>;

/** Safe for PostgREST filters: drops filter syntax and LIKE wildcards. */
const clean = (v: unknown, max = 60) => str(v, max).replace(/[%_,()*"\\:]/g, " ").replace(/\s+/g, " ").trim();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function findCategory(name: string): Promise<{ id: string; name: string } | null> {
    const q = clean(name);
    if (!q) return null;
    const { data } = await supabaseAdmin.from("categories").select("id, name").ilike("name", `%${q}%`).limit(10);
    const rows = data ?? [];
    return rows.find((c: any) => c.name.toLowerCase() === q.toLowerCase()) ?? rows[0] ?? null;
}

const shopRows = () => supabaseAdmin.from("products").select(PRODUCT_FIELDS).eq("is_active", true).eq("is_wholesale_only", false);

/** The kinds of piece the shop sells (product types; categories also hold deals and promotions), for a search that found nothing. */
async function shopKinds(): Promise<string[]> {
    const { data, error } = await supabaseAdmin.from("products").select("category_type").eq("is_active", true).eq("is_wholesale_only", false).limit(1000);
    if (error) throw error;
    const kinds = new Map<string, string>();
    for (const t of data ?? []) {
        const k = String((t as { category_type: unknown }).category_type ?? "").trim();
        if (k) kinds.set(k.toLowerCase(), k);
    }
    return [...kinds.values()].sort();
}

/** Live stock for the rows, narrowed to the asked-for size and colour. */
async function shape(rows: Row[], size: string, colour: string): Promise<(Candidate<Out> & { row: Row })[]> {
    if (rows.length === 0) return [];
    const [stock, preorder] = await Promise.all([stockFor(rows), preorderEligibleIds(rows)]);
    return rows.map(p => {
        const base = publicProduct(p, stock.get(p.id), preorder.has(p.id));
        const out = "options" in base && base.options && (size || colour)
            ? { ...base, options: base.options.filter(o => (!size || sizeMatches(o.size, size)) && (!colour || normAttr(o.colour) === normAttr(colour))) }
            : base;
        return { row: p, out, categories: categoriesOf(p) };
    });
}

/** Product links (and photos on WhatsApp, which keeps a few so photos can follow the ones the reply names). */
function pushOpen(ctx: ShopToolContext, shown: Out[]): void {
    const limit = ctx.channel === "whatsapp" ? 4 : 2;
    for (const out of shown.slice(0, limit)) {
        ctx.buttons.push({
            kind: "open_product", label: `${BUTTON_LABELS.open} ${out.name}`.slice(0, 40), href: out.url,
            ...(out.image ? { productId: out.product_id } : {}), ...(out.sku ? { sku: out.sku } : {}),
        });
    }
}

export async function findProducts(input: any, ctx: ShopToolContext): Promise<ToolOutcome> {
    const q = clean(input?.query);
    const catName = str(input?.category, 60);
    const sku = normaliseSku(input?.sku);
    const max = typeof input?.max_price_ghs === "number" && input.max_price_ghs > 0 ? input.max_price_ghs : Infinity;
    // A budget alone is browsing: the newest pieces in stock under it.
    if (!sku && q.length < 2 && !catName && max === Infinity) return err("Ask which product or category they want, e.g. dresses, bags or shoes.");
    ctx.notes.topic = "a product";
    const size = str(input?.size, 40), colour = str(input?.colour, 60);

    let rows: Row[];
    let named: boolean;
    if (sku) {
        // ~160 products: read them all, so "SKU: D-07" finds "D7".
        const { data, error } = await shopRows().not("sku", "is", null).limit(1000);
        if (error) throw error;
        const all = (data ?? []) as Row[];
        rows = all.filter(r => skuMatches(r.sku, input?.sku));
        if (rows.length === 0) {
            // No product holds that code: pieces in stock with nearby codes on the same row may be it.
            const near = all.map(r => ({ r, d: skuDistance(r.sku, input?.sku) })).filter(x => x.d <= NEAR_SKU).sort((a, b) => a.d - b.d).map(x => x.r);
            const shownNear = near.length ? (await shape(near, size, colour)).filter(c => inStock(c.out)).slice(0, NAMED_MAX).map(c => ({ ...c.out, in_stock: true })) : [];
            if (shownNear.length === 0) return ok({ products: [], note: `No product has SKU ${sku}. Ask the customer to check it, or search by name.` });
            pushOpen(ctx, shownNear);
            return ok({ products: shownNear, note: `No product has SKU ${sku} exactly. These pieces in stock have nearby codes; show them as possibly the one in their post and ask the customer to confirm. Never say one of them is SKU ${sku}.` });
        }
        named = true;
    } else {
        let query = shopRows();
        // Each word on its own, in the name, type or brand (words come from clean(): no filter syntax).
        const words = q.length >= 2 ? searchWords(q) : [];
        if (q.length >= 2 && words.length === 0) return ok({ products: [], note: "Ask what kind of piece they want." });
        if (words.length > 0) query = query.or(words.flatMap(w => [`name.ilike.%${w}%`, `category_type.ilike.%${w}%`, `brand.ilike.%${w}%`]).join(","));
        if (catName) {
            const cat = await findCategory(catName);
            if (!cat) return ok({ products: [], note: `The shop has no "${clean(catName)}" category.` });
            // cat.name is trusted DB data; quote it so commas, parentheses and wildcards cannot break the filter.
            const typeName = cat.name.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
            query = query.or(`category_id.eq.${cat.id},category_ids.cs.{"${cat.id}"},category_type.ilike."${typeName}"`);
        }
        const { data, error } = await query.order("created_at", { ascending: false }).limit(words.length > 1 ? SEARCH_ROWS * 2 : SEARCH_ROWS);
        if (error) throw error;
        rows = (data ?? []) as Row[];
        if (rows.length === 0) return ok({ products: [], shop_sells: await shopKinds(), note: "Nothing in the shop matches that. Suggest one of the kinds of piece the shop sells." });
        // A name holding the whole phrase, for only a few products, is the customer asking for those pieces.
        // One word ("heels") names pieces only when it is in every match's name; otherwise it is a kind of piece.
        const phrase = phraseMatches(rows, q);
        named = phrase.length > 0 && phrase.length <= NAMED_MAX && (words.length > 1 || phrase.length === rows.length);
        if (named) rows = phrase;
        // Otherwise the pieces matching the most words first, newest first among equals (the sort is stable).
        else if (words.length > 1) rows = rows.map(r => ({ r, s: wordScore(r, words) })).sort((a, b) => b.s - a.s).map(x => x.r).slice(0, SEARCH_ROWS);
    }

    const matches = (await shape(rows, size, colour)).filter(c => named || c.out.price_ghs <= max);
    // Similar pieces for a named piece that is sold out: in stock, from its own categories.
    let pool = matches;
    const soldOut = named ? matches.filter(c => !inStock(c.out)) : [];
    if (soldOut.length > 0) {
        const ids = [...new Set(soldOut.flatMap(c => c.categories).filter(k => UUID.test(k)))];
        if (ids.length > 0) {
            const { data, error } = await shopRows()
                .or(`category_id.in.(${ids.join(",")}),category_ids.ov.{${ids.join(",")}}`)
                .order("created_at", { ascending: false }).limit(SEARCH_ROWS);
            if (error) throw error;
            pool = await shape((data ?? []) as Row[], size, colour);
        }
    }
    const picked = pickResults(matches, pool, { named, colour: colour || null });

    // Links and photos: pieces in stock only.
    pushOpen(ctx, picked.products.flatMap(p => (p.in_stock ? [p] : (p.similar_in_stock ?? []))));

    // One product, one exact in-stock option: offer to add it to the bag.
    if (picked.products.length === 1 && picked.products[0].in_stock && (size || colour)) {
        const hit = matches.find(c => c.out.product_id === picked.products[0].product_id)!;
        const { row, out } = hit;
        const opts = ("options" in out ? out.options : undefined) ?? [];
        const needs = { size: (row.available_sizes ?? []).length > 0, colour: (row.available_colors ?? []).length > 0, brand: (row.available_brands ?? []).length > 0 };
        if (opts.length === 1 && opts[0].stock !== "Sold out" && !needs.brand
            && (!needs.size || (size && opts[0].size && sizeMatches(opts[0].size, size)))
            && (!needs.colour || (colour && opts[0].colour && normAttr(opts[0].colour) === normAttr(colour)))) {
            ctx.buttons.push({ kind: "add_to_cart", label: BUTTON_LABELS.add, item: cartLineFor(row, opts[0], false) });
        }
    }

    return ok(picked);
}
