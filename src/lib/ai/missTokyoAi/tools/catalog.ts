// Catalogue tools: product search, one product's stock, and the whole-catalogue
// stock report. Stock is live and net of holds (the checkout's getStockStatus).
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { stockFor, type StockOption } from "@/lib/ai/catalogStock";
import { normAttr, normSize } from "@/lib/utils/normAttr";
import { preorderEligibleIds } from "@/lib/checkout/createCheckoutOrder";
import { cleanSearch, err, intIn, ok, str, UUID_RE, type ToolDef } from "./shared";

const PRODUCT_FIELDS =
    "id, name, sku, price_ghs, is_sale, discount_value, is_active, preorder_enabled, track_inventory, track_variant_inventory, inventory_count, available_sizes, available_colors, available_brands, category_id, category_ids, category_type";

async function describeProducts(products: any[]) {
    const [stock, preorder] = await Promise.all([stockFor(products), preorderEligibleIds(products)]);
    return products.map(p => {
        const price = Number(p.price_ghs) || 0;
        const onSale = p.is_sale && Number(p.discount_value) > 0;
        return {
            product_id: p.id,
            name: String(p.name ?? "").trim(),
            sku: p.sku ?? null,
            price_ghs: onSale ? parseFloat((price * (1 - Number(p.discount_value) / 100)).toFixed(2)) : price,
            ...(onSale ? { was_ghs: price } : {}),
            active: p.is_active !== false,
            takes_preorders: preorder.has(p.id),
            sizes: p.available_sizes ?? [],
            colours: p.available_colors ?? [],
            brands: p.available_brands ?? [],
            stock: stock.get(p.id),
        };
    });
}

/** Category by name (exact first, then partial). */
async function findCategory(name: string): Promise<{ id: string; name: string } | null> {
    const q = cleanSearch(name, 60);
    if (!q) return null;
    const { data } = await supabaseAdmin.from("categories").select("id, name").ilike("name", `%${q}%`).limit(10);
    const rows = data ?? [];
    return rows.find((c: any) => c.name.toLowerCase() === q.toLowerCase()) ?? rows[0] ?? null;
}

const categoryFilter = (cat: { id: string; name: string }) =>
    `category_id.eq.${cat.id},category_ids.cs.{"${cat.id}"},category_type.ilike.${cleanSearch(cat.name)}`;

export const catalogTools: ToolDef[] = [
    {
        def: {
            name: "search_products",
            description: "Find products by name or SKU, or list a category (e.g. category 'dresses' with no query). Returns prices, options and live stock for each option (units held by unpaid orders already subtracted).",
            input_schema: {
                type: "object",
                properties: {
                    query: { type: "string", description: "Part of the product name or SKU. Optional when a category is given." },
                    category: { type: "string", description: "Category name, e.g. bags, dresses, shoes." },
                    include_inactive: { type: "boolean", description: "Also return products hidden from the shop. Default false." },
                    limit: { type: "integer", minimum: 1, maximum: 15 },
                },
            },
        },
        async run(input) {
            const q = cleanSearch(input?.query);
            const catName = str(input?.category, 60);
            if (q.length < 2 && !catName) return err("Give at least 2 characters of a product name or SKU, or a category name.");
            let query = supabaseAdmin.from("products").select(PRODUCT_FIELDS);
            if (q.length >= 2) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);
            if (catName) {
                const cat = await findCategory(catName);
                if (!cat) return ok({ products: [], note: `No category matches "${catName}".` });
                query = query.or(categoryFilter(cat));
            }
            if (input?.include_inactive !== true) query = query.eq("is_active", true);
            const { data, error } = await query.order("created_at", { ascending: false }).limit(intIn(input?.limit, 1, 15, 8));
            if (error) throw error;
            if (!data?.length) return ok({ products: [], note: "No products match." });
            return ok({ products: await describeProducts(data) });
        },
    },
    {
        def: {
            name: "check_stock",
            description: "Live stock for one product, optionally narrowed to a size, colour or brand.",
            input_schema: {
                type: "object",
                properties: {
                    product_id: { type: "string" },
                    size: { type: "string" },
                    colour: { type: "string" },
                    brand: { type: "string" },
                },
                required: ["product_id"],
            },
        },
        async run(input) {
            const id = str(input?.product_id, 40);
            if (!UUID_RE.test(id)) return err("product_id must be the id returned by search_products.");
            const { data: p, error } = await supabaseAdmin.from("products").select(PRODUCT_FIELDS).eq("id", id).maybeSingle();
            if (error) throw error;
            if (!p) return err("No product with that id.");
            const [described] = await describeProducts([p]);
            const size = str(input?.size, 40), colour = str(input?.colour, 60), brand = str(input?.brand, 60);
            if (described.stock?.options && (size || colour || brand)) {
                described.stock.options = described.stock.options.filter(o =>
                    (!size || normSize(o.size) === normSize(size)) &&
                    (!colour || normAttr(o.colour) === normAttr(colour)) &&
                    (!brand || normAttr(o.brand) === normAttr(brand)));
            }
            return ok(described);
        },
    },
    {
        def: {
            name: "stock_report",
            description: "Scan the whole live catalogue for stock problems: which products, sizes, colours and brands are sold out or running low. Checks every option, not just product totals, and subtracts units held by unpaid orders. Use for 'what is running out', 'what is sold out', 'what should we restock'.",
            input_schema: {
                type: "object",
                properties: {
                    status: { type: "string", enum: ["low_or_out", "out", "low", "product_out"], description: "low_or_out (default): any option at or below the threshold. out: any option sold out. low: options low but not sold out. product_out: every option of the product is sold out." },
                    threshold: { type: "integer", minimum: 1, maximum: 50, description: "An option is 'low' at or below this many units. Default 3." },
                    category: { type: "string", description: "Only this category." },
                    include_preorder: { type: "boolean", description: "Include products that take pre-orders (they are expected to run out). Default false." },
                    limit: { type: "integer", minimum: 1, maximum: 60, description: "Max products returned. Default 25." },
                },
            },
        },
        async run(input) {
            const status: "low_or_out" | "out" | "low" | "product_out" =
                ["out", "low", "product_out"].includes(input?.status) ? input.status : "low_or_out";
            const threshold = intIn(input?.threshold, 1, 50, 3);
            const limit = intIn(input?.limit, 1, 60, 25);
            let query = supabaseAdmin.from("products").select(PRODUCT_FIELDS).eq("is_active", true).eq("track_inventory", true);
            const catName = str(input?.category, 60);
            if (catName) {
                const cat = await findCategory(catName);
                if (!cat) return ok({ products: [], note: `No category matches "${catName}".` });
                query = query.or(categoryFilter(cat));
            }
            const { data: products, error } = await query.limit(1000);
            if (error) throw error;
            let list = products ?? [];
            if (input?.include_preorder !== true && list.length) {
                const pre = await preorderEligibleIds(list);
                list = list.filter((p: any) => !pre.has(p.id));
            }
            const stock = await stockFor(list, 200);

            const matches = (n: number) =>
                status === "out" || status === "product_out" ? n <= 0 : status === "low" ? n > 0 && n <= threshold : n <= threshold;

            const flagged: any[] = [];
            const summary = { products_with_a_sold_out_option: 0, products_fully_sold_out: 0, sold_out_options: 0, low_options: 0 };
            for (const p of list) {
                const s = stock.get(p.id);
                if (!s) continue;
                if (s.tracked === "per_option") {
                    const all = s.options ?? [];
                    const outCount = all.filter(o => o.available <= 0).length;
                    summary.sold_out_options += outCount;
                    summary.low_options += all.filter(o => o.available > 0 && o.available <= threshold).length;
                    if (outCount > 0) summary.products_with_a_sold_out_option++;
                    if (all.length > 0 && outCount === all.length) summary.products_fully_sold_out++;
                    if (status === "product_out" && !(all.length > 0 && outCount === all.length)) continue;
                    const opts = all.filter(o => matches(o.available));
                    if (opts.length === 0) continue;
                    const total = (s.options ?? []).reduce((n, o) => n + o.available, 0);
                    flagged.push({
                        product_id: p.id, name: String(p.name ?? "").trim(), sku: p.sku ?? null,
                        total_available: total,
                        options_flagged: opts.sort((a, b) => a.available - b.available),
                        options_total: (s.options ?? []).length,
                    });
                } else if (s.tracked === "product" && matches(s.available ?? 0)) {
                    if ((s.available ?? 0) <= 0) { summary.products_fully_sold_out++; summary.products_with_a_sold_out_option++; }
                    flagged.push({ product_id: p.id, name: String(p.name ?? "").trim(), sku: p.sku ?? null, total_available: s.available ?? 0 });
                }
            }
            // Most urgent first: sold-out options, then the lowest totals.
            flagged.sort((a, b) => {
                const aOut = a.options_flagged ? a.options_flagged.filter((o: StockOption) => o.available <= 0).length : (a.total_available <= 0 ? 1 : 0);
                const bOut = b.options_flagged ? b.options_flagged.filter((o: StockOption) => o.available <= 0).length : (b.total_available <= 0 ? 1 : 0);
                return bOut - aOut || a.total_available - b.total_available;
            });
            return ok({
                criteria: { status, threshold, category: catName || null, preorder_products_included: input?.include_preorder === true },
                products_scanned: list.length,
                products_flagged: flagged.length,
                summary,
                products: flagged.slice(0, limit),
                ...(flagged.length > limit ? { note: `${flagged.length - limit} more not shown; narrow by category or raise limit.` } : {}),
            });
        },
    },
];
