// Tools for the staff Store Assistant. Every tool re-validates its input and
// reads live data with the service role; the model never supplies prices,
// stock or pre-order status. create_order goes through createCheckoutOrder, the
// storefront's own path.
import type Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStockStatus } from "@/lib/inventory";
import { normAttr, normSize } from "@/lib/utils/normAttr";
import {
    createCheckoutOrder,
    quoteCheckoutOrder,
    preorderEligibleIds,
    normaliseGhanaPhone,
    PLACEHOLDER_EMAIL_DOMAIN,
    type CreateCheckoutOrderInput,
} from "@/lib/checkout/createCheckoutOrder";
import { logActivity } from "@/lib/utils/logActivity";

export type ToolContext = { userId: string; role: string };
export type ToolOutcome = { content: string; isError: boolean };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORDER_STATUSES = [
    "pending", "paid", "processing", "packed", "shipped", "ready_for_pickup",
    "fulfilled", "delivered", "refunded", "cancelled", "failed", "reservation_expired",
];

const ok = (data: unknown): ToolOutcome => ({ content: JSON.stringify(data), isError: false });
const err = (message: string): ToolOutcome => ({ content: message, isError: true });

const str = (v: unknown, max = 200): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
const intIn = (v: unknown, min: number, max: number, dflt: number): number =>
    Number.isInteger(v) && (v as number) >= min && (v as number) <= max ? (v as number) : dflt;

/** Last 9 digits of a Ghana number, or null. */
function last9(phone: unknown): string | null {
    const digits = String(phone ?? "").replace(/\D/g, "");
    return digits.length >= 9 ? digits.slice(-9) : null;
}

const isPlaceholderEmail = (email: string | null | undefined) =>
    !!email && email.toLowerCase().endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`);

// ─── Definitions ─────────────────────────────────────────────────────────────
// Order is fixed: the tool list is part of the cached prompt prefix.

const orderInputSchema = {
    type: "object" as const,
    properties: {
        customer_name: { type: "string" },
        customer_phone: { type: "string", description: "Any Ghana format: 024..., +233..., 233..." },
        customer_email: { type: "string", description: "Only if the customer gave one." },
        items: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    product_id: { type: "string" },
                    size: { type: "string" },
                    colour: { type: "string" },
                    brand: { type: "string" },
                    quantity: { type: "integer", minimum: 1 },
                },
                required: ["product_id", "quantity"],
            },
        },
        delivery_method: { type: "string", enum: ["delivery", "pickup"] },
        delivery_address: { type: "string", description: "Full street address and area. Required for delivery." },
        delivery_zone: {
            type: "string",
            enum: ["accra", "outside"],
            description: "accra = anywhere in Greater Accra; outside = elsewhere in Ghana. Required for delivery.",
        },
        region: { type: "string", description: "Ghana region, e.g. Greater Accra, Ashanti." },
        notes: { type: "string" },
        discount_code: { type: "string" },
    },
    required: ["customer_name", "customer_phone", "items", "delivery_method"],
};

export const STORE_ASSISTANT_TOOLS: Anthropic.Tool[] = [
    {
        name: "search_products",
        description: "Find products by name or SKU. Returns prices, options and live stock for each option (units already held by unpaid orders are subtracted).",
        input_schema: {
            type: "object",
            properties: {
                query: { type: "string", description: "Part of the product name or SKU." },
                include_inactive: { type: "boolean", description: "Also return products hidden from the shop. Default false." },
                limit: { type: "integer", minimum: 1, maximum: 10 },
            },
            required: ["query"],
        },
    },
    {
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
    {
        name: "lookup_customer",
        description: "Find a returning customer by phone number: their name, email and the delivery details of their last order.",
        input_schema: {
            type: "object",
            properties: { phone: { type: "string" } },
            required: ["phone"],
        },
    },
    {
        name: "get_order",
        description: "One order by its 8-character reference (e.g. 7D4D75EE) or full id: status, payment, items, totals, delivery.",
        input_schema: {
            type: "object",
            properties: { order: { type: "string" } },
            required: ["order"],
        },
    },
    {
        name: "list_orders",
        description: "Recent orders, newest first, optionally filtered by status and/or customer phone.",
        input_schema: {
            type: "object",
            properties: {
                status: { type: "string", enum: ORDER_STATUSES },
                customer_phone: { type: "string" },
                limit: { type: "integer", minimum: 1, maximum: 25 },
            },
        },
    },
    {
        name: "quote_order",
        description: "Price an order exactly as checkout would (discounts, service fee, delivery) without creating anything. Always quote before create_order and tell staff the total.",
        input_schema: orderInputSchema,
    },
    {
        name: "create_order",
        description: "Create the order and get a Paystack payment link for the customer. Holds the stock for 15 minutes. Only after staff have confirmed the quoted total.",
        input_schema: orderInputSchema,
    },
];

// ─── Stock ───────────────────────────────────────────────────────────────────

type StockOption = { size: string | null; colour: string | null; brand: string | null; available: number };

async function stockFor(products: any[]): Promise<Map<string, { tracked: string; available?: number; options?: StockOption[] }>> {
    const result = new Map<string, { tracked: string; available?: number; options?: StockOption[] }>();
    const variantTracked = products.filter(p => p.track_variant_inventory).map(p => p.id);
    const variantsByProduct = new Map<string, any[]>();
    if (variantTracked.length > 0) {
        const { data: variants } = await supabaseAdmin
            .from("product_variants")
            .select("product_id, size, color, brand")
            .in("product_id", variantTracked);
        for (const v of variants ?? []) {
            const list = variantsByProduct.get(v.product_id) ?? [];
            list.push(v);
            variantsByProduct.set(v.product_id, list);
        }
    }

    for (const p of products) {
        if (p.track_variant_inventory) {
            const variants = (variantsByProduct.get(p.id) ?? []).slice(0, 60);
            const statuses = await getStockStatus(variants.map(v => ({
                productId: p.id, size: v.size ?? "", color: v.color ?? undefined, brand: v.brand ?? undefined, quantity: 1,
            })));
            result.set(p.id, {
                tracked: "per_option",
                options: variants.map((v, i) => ({
                    size: v.size ?? null, colour: v.color ?? null, brand: v.brand ?? null,
                    available: Math.max(0, statuses[i]?.available ?? 0),
                })),
            });
        } else if (p.track_inventory) {
            const [s] = await getStockStatus([{ productId: p.id, quantity: 1 }]);
            result.set(p.id, { tracked: "product", available: Math.max(0, s?.available ?? 0) });
        } else {
            result.set(p.id, { tracked: "not_tracked" });
        }
    }
    return result;
}

const PRODUCT_FIELDS =
    "id, name, sku, price_ghs, is_sale, discount_value, is_active, preorder_enabled, track_inventory, track_variant_inventory, available_sizes, available_colors, available_brands, category_id, category_ids, category_type";

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

// ─── Orders ──────────────────────────────────────────────────────────────────

function orderSummary(o: any, withItems: boolean) {
    const items: any[] = Array.isArray(o.items) ? o.items : [];
    return {
        ref: o.ref ?? String(o.id).slice(0, 8).toUpperCase(),
        order_id: o.id,
        created_at: o.created_at,
        source: o.source,
        status: o.status,
        payment_status: o.payment_status,
        fulfillment_status: o.fulfillment_status,
        customer: { name: o.customer_name, phone: o.customer_phone, email: isPlaceholderEmail(o.customer_email) ? null : o.customer_email },
        total_ghs: Number(o.total_amount) || 0,
        delivery: {
            method: o.delivery_method,
            zone: o.delivery_zone,
            fee_ghs: Number(o.delivery_fee) || 0,
            address: o.shipping_address?.text ?? null,
            region: o.shipping_address?.region ?? null,
        },
        ...(withItems
            ? {
                items: items.slice(0, 30).map(i => ({
                    name: i.name, size: i.size || null, colour: i.color || null, brand: i.brand || null,
                    quantity: i.quantity, pre_order: i.isPreOrder === true,
                })),
                discount: o.discount_code ? { code: o.discount_code, amount_ghs: Number(o.discount_amount) || 0 } : null,
                paystack_fee_ghs: o.paystack_fee != null ? Number(o.paystack_fee) : null,
                paid_at: o.paid_at ?? null,
            }
            : { item_count: items.reduce((n, i) => n + (Number(i.quantity) || 1), 0) }),
    };
}

function toOrderInput(input: any): CreateCheckoutOrderInput {
    const items = Array.isArray(input?.items) ? input.items : [];
    return {
        items: items.map((i: any) => ({
            product_id: str(i?.product_id, 40),
            size: str(i?.size, 40) || null,
            colour: str(i?.colour, 60) || null,
            brand: str(i?.brand, 60) || null,
            quantity: i?.quantity,
        })),
        customer: {
            name: str(input?.customer_name, 120),
            phone: str(input?.customer_phone, 30),
            email: str(input?.customer_email, 160) || null,
        },
        delivery: {
            method: input?.delivery_method === "pickup" ? "pickup" : "delivery",
            address: str(input?.delivery_address, 500) || null,
            zone: input?.delivery_zone === "accra" || input?.delivery_zone === "outside" ? input.delivery_zone : null,
            region: str(input?.region, 60) || null,
        },
        source: "dashboard",
        notes: str(input?.notes, 1000) || null,
        discount_code: str(input?.discount_code, 60) || null,
        hold_minutes: 15,
    };
}

// ─── Dispatch ────────────────────────────────────────────────────────────────

export async function runStoreAssistantTool(name: string, input: any, ctx: ToolContext): Promise<ToolOutcome> {
    try {
        switch (name) {
            case "search_products": {
                const q = str(input?.query, 60).replace(/[%,()*"\\:]/g, " ").trim();
                if (q.length < 2) return err("Give at least 2 characters of the product name or SKU.");
                let query = supabaseAdmin
                    .from("products")
                    .select(PRODUCT_FIELDS)
                    .or(`name.ilike.%${q}%,sku.ilike.%${q}%`);
                if (input?.include_inactive !== true) query = query.eq("is_active", true);
                const { data, error } = await query
                    .order("created_at", { ascending: false })
                    .limit(intIn(input?.limit, 1, 10, 6));
                if (error) throw error;
                if (!data?.length) return ok({ products: [], note: `No products match "${q}".` });
                return ok({ products: await describeProducts(data) });
            }

            case "check_stock": {
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
            }

            case "lookup_customer": {
                const l9 = last9(input?.phone);
                if (!l9) return err("That does not look like a phone number.");
                const [{ data: orders, error }, { data: profiles }] = await Promise.all([
                    supabaseAdmin.rpc("fn_orders_by_phone", { p_last9: l9, p_limit: 5 }),
                    supabaseAdmin.from("profiles").select("full_name, email").ilike("phone", `%${l9}`).limit(1),
                ]);
                if (error) throw error;
                const list: any[] = (orders as any[]) ?? [];
                const profile = profiles?.[0];
                if (list.length === 0 && !profile) return ok({ found: false });
                const last = list[0];
                const realEmail = [profile?.email, ...list.map(o => o.customer_email)].find(e => e && !isPlaceholderEmail(e)) ?? null;
                return ok({
                    found: true,
                    name: profile?.full_name ?? last?.customer_name ?? null,
                    email: realEmail,
                    recent_orders: list.length,
                    last_order: last ? orderSummary(last, false) : null,
                });
            }

            case "get_order": {
                const raw = str(input?.order, 60).replace(/^#/, "");
                let q = supabaseAdmin.from("orders").select("*");
                if (UUID_RE.test(raw)) q = q.eq("id", raw);
                else {
                    const ref = raw.toUpperCase().replace(/[^A-F0-9]/g, "");
                    if (ref.length !== 8) return err("Give the 8-character order reference or the full order id.");
                    q = q.eq("ref", ref);
                }
                const { data, error } = await q.limit(1).maybeSingle();
                if (error) throw error;
                if (!data) return ok({ found: false });
                return ok(orderSummary(data, true));
            }

            case "list_orders": {
                const limit = intIn(input?.limit, 1, 25, 10);
                const status = ORDER_STATUSES.includes(input?.status) ? input.status : null;
                const phone = input?.customer_phone ? last9(input.customer_phone) : null;
                if (input?.customer_phone && !phone) return err("That does not look like a phone number.");
                let rows: any[] = [];
                if (phone) {
                    const { data, error } = await supabaseAdmin.rpc("fn_orders_by_phone", { p_last9: phone, p_limit: 50 });
                    if (error) throw error;
                    rows = ((data as any[]) ?? []).filter(o => !status || o.status === status).slice(0, limit);
                } else {
                    let q = supabaseAdmin.from("orders").select("*").order("created_at", { ascending: false }).limit(limit);
                    if (status) q = q.eq("status", status);
                    const { data, error } = await q;
                    if (error) throw error;
                    rows = data ?? [];
                }
                return ok({ orders: rows.map(o => orderSummary(o, false)) });
            }

            case "quote_order": {
                const result = await quoteCheckoutOrder(toOrderInput(input));
                if (!result.success) return err(result.error);
                return ok({ totals_ghs: result.totals, out_of_stock: result.outOfStock });
            }

            case "create_order": {
                const orderInput = toOrderInput(input);
                const result = await createCheckoutOrder(orderInput);
                if (!result.success) return err(result.error);
                await logActivity({
                    userId: ctx.userId,
                    userRole: ctx.role,
                    actionType: "CREATE",
                    resource: "order",
                    resourceId: result.orderId,
                    details: {
                        order_number: result.orderId.slice(0, 8),
                        via: "store_assistant",
                        total: result.totals.total,
                        customer_phone: normaliseGhanaPhone(orderInput.customer.phone),
                    },
                }).catch(() => {});
                return ok({
                    order_ref: result.orderId.slice(0, 8).toUpperCase(),
                    order_id: result.orderId,
                    payment_link: result.authorizationUrl,
                    totals_ghs: result.totals,
                    stock_held_minutes: 15,
                });
            }

            default:
                return err(`Unknown tool "${name}".`);
        }
    } catch (e) {
        console.error(`[store-assistant] tool ${name} failed`, e);
        return err("That lookup failed. Try again, or check the dashboard directly.");
    }
}
