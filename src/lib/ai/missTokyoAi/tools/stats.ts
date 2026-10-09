// The flexible stats tool: one measure, grouped one way, filtered, over a
// period, optionally against the previous period. Built only from fixed
// building blocks — the model never writes SQL here — and on the dashboard's
// own definition of a sale (payment_status = 'paid', by order date, Ghana
// time = UTC).
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { DATE_RE, err, intIn, money, ok, str, todayUtc, type StaffRole, type ToolDef } from "./shared";

const RANGES = [
    "today", "yesterday", "last_7_days", "last_30_days", "last_60_days", "last_90_days",
    "this_month", "last_month", "this_year", "custom",
] as const;
const MEASURES = ["revenue", "orders", "units", "average_order", "discounts"] as const;
const GROUPS = [
    "none", "staff", "product", "variant", "category", "channel", "payment_method",
    "day", "week", "month", "zone", "discount_code", "customer",
] as const;
type Measure = (typeof MEASURES)[number];
type Group = (typeof GROUPS)[number];

/** Groupings that name people. Sales staff get totals, not people lists. */
const RESTRICTED_GROUPS: Group[] = ["staff", "customer"];
const LINE_GROUPS: Group[] = ["product", "variant", "category"];
const D = 86_400_000;

export function rangeBounds(range: string, fromDate?: string, toDate?: string):
    { from: number; to: number; label: string } | { error: string } {
    const day = (d: string) => new Date(`${d}T00:00:00.000Z`).getTime();
    const today = day(todayUtc());
    const n = new Date(today);
    switch (range) {
        case "today": return { from: today, to: today + D, label: "today" };
        case "yesterday": return { from: today - D, to: today, label: "yesterday" };
        case "last_7_days": return { from: today - 6 * D, to: today + D, label: "the last 7 days" };
        case "last_30_days": return { from: today - 29 * D, to: today + D, label: "the last 30 days" };
        case "last_60_days": return { from: today - 59 * D, to: today + D, label: "the last 60 days" };
        case "last_90_days": return { from: today - 89 * D, to: today + D, label: "the last 90 days" };
        case "this_month": return { from: Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1), to: today + D, label: "this month so far" };
        case "last_month": return {
            from: Date.UTC(n.getUTCFullYear(), n.getUTCMonth() - 1, 1),
            to: Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1),
            label: "last month",
        };
        case "this_year": return { from: Date.UTC(n.getUTCFullYear(), 0, 1), to: today + D, label: "this year so far" };
        case "custom": {
            if (!fromDate || !DATE_RE.test(fromDate) || !toDate || !DATE_RE.test(toDate)) return { error: "For a custom range give from and to as YYYY-MM-DD." };
            const f = day(fromDate), t = day(toDate) + D;
            if (t <= f) return { error: "The 'to' date must be on or after the 'from' date." };
            if (t - f > 366 * D) return { error: "Custom ranges can cover at most a year." };
            return { from: f, to: t, label: `${fromDate} to ${toDate}` };
        }
    }
    return { error: "Unknown range." };
}

const ORDER_FIELDS =
    "id, created_at, total_amount, discount_amount, auto_discount_amount, items, source, payment_method, delivery_zone, discount_code, recorded_by, customer_name, customer_phone, customer_email";

async function paidOrders(from: number, to: number): Promise<any[]> {
    const rows: any[] = [];
    for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabaseAdmin
            .from("orders")
            .select(ORDER_FIELDS)
            .eq("payment_status", "paid")
            .gte("created_at", new Date(from).toISOString())
            .lt("created_at", new Date(to).toISOString())
            .order("created_at")
            .range(offset, offset + 999);
        if (error) throw error;
        rows.push(...(data ?? []));
        if (!data || data.length < 1000 || rows.length >= 25000) break;
    }
    return rows;
}

/**
 * Who rang up each till sale: orders.recorded_by, or — for till sales made
 * before that column existed — the till session that settled the order.
 * Online orders have no staff member.
 */
async function staffNames(orders: any[]): Promise<Map<string, string>> {
    const byOrder = new Map<string, string>();
    const missing = orders.filter(o => o.source === "pos" && !o.recorded_by).map(o => o.id);
    for (let i = 0; i < missing.length; i += 300) {
        const { data } = await supabaseAdmin.from("pos_sessions").select("order_id, created_by").in("order_id", missing.slice(i, i + 300));
        for (const s of data ?? []) if (s.created_by) byOrder.set(s.order_id, s.created_by);
    }
    const staffIds = new Set<string>();
    for (const o of orders) {
        const id = o.recorded_by ?? byOrder.get(o.id);
        if (id) staffIds.add(id);
    }
    const names = new Map<string, string>();
    const ids = [...staffIds];
    for (let i = 0; i < ids.length; i += 300) {
        const { data } = await supabaseAdmin.from("profiles").select("id, full_name, first_name, last_name, email").in("id", ids.slice(i, i + 300));
        for (const p of data ?? []) {
            const name = (p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || String(p.email ?? "").split("@")[0] || "Unknown staff")
                .replace(/\s+/g, " ").trim();
            names.set(p.id, name);
        }
    }
    const result = new Map<string, string>();
    for (const o of orders) {
        if (o.source !== "pos") continue;
        const id = o.recorded_by ?? byOrder.get(o.id);
        result.set(o.id, id ? names.get(id) ?? "Unknown staff" : "Unknown staff");
    }
    return result;
}

/** One category per product (its primary one), so a sale is never counted twice. */
async function productCategories(productIds: string[]): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    if (productIds.length === 0) return out;
    const { data: cats } = await supabaseAdmin.from("categories").select("id, name");
    const catName = new Map((cats ?? []).map((c: any) => [c.id, c.name as string]));
    for (let i = 0; i < productIds.length; i += 300) {
        const { data } = await supabaseAdmin.from("products").select("id, category_id, category_ids, category_type").in("id", productIds.slice(i, i + 300));
        for (const p of data ?? []) {
            const name = (p.category_id && catName.get(p.category_id))
                || (Array.isArray(p.category_ids) && p.category_ids.map((c: string) => catName.get(c)).find(Boolean))
                || p.category_type
                || "Uncategorised";
            out.set(p.id, String(name));
        }
    }
    return out;
}

const channelOf = (o: any) => (o.source === "pos" ? "in-store (POS)" : "online");
const weekOf = (iso: string) => {
    const d = new Date(iso.slice(0, 10) + "T00:00:00.000Z");
    const monday = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * D);
    return `week of ${monday.toISOString().slice(0, 10)}`;
};
const customerKey = (o: any) => {
    const digits = String(o.customer_phone ?? "").replace(/\D/g, "");
    return digits.length >= 9 ? `p:${digits.slice(-9)}` : o.customer_email ? `e:${String(o.customer_email).toLowerCase()}` : `n:${o.customer_name ?? "?"}`;
};

type Bucket = { key: string; label: string; orders: Set<string>; revenue: number; units: number; discounts: number };

function value(b: Bucket, m: Measure): number {
    switch (m) {
        case "revenue": return money(b.revenue);
        case "orders": return b.orders.size;
        case "units": return b.units;
        case "average_order": return b.orders.size ? money(b.revenue / b.orders.size) : 0;
        case "discounts": return money(b.discounts);
    }
}

async function compute(args: {
    orders: any[]; measure: Measure; group: Group; filters: { channel?: string; payment_method?: string; staff?: string; category?: string; product?: string };
}) {
    const { measure, group, filters } = args;
    let orders = args.orders;
    if (filters.channel) orders = orders.filter(o => (filters.channel === "pos") === (o.source === "pos"));
    if (filters.payment_method) orders = orders.filter(o => (o.payment_method ?? "unknown") === filters.payment_method);

    const needStaff = group === "staff" || !!filters.staff;
    const staff = needStaff ? await staffNames(orders) : new Map<string, string>();
    if (filters.staff) {
        const q = filters.staff.toLowerCase();
        orders = orders.filter(o => (staff.get(o.id) ?? "").toLowerCase().includes(q));
    }

    const lineLevel = LINE_GROUPS.includes(group) || !!filters.category || !!filters.product;
    const productIds = new Set<string>();
    if (lineLevel) for (const o of orders) for (const i of Array.isArray(o.items) ? o.items : []) if (i.productId) productIds.add(i.productId);
    const cats = group === "category" || filters.category ? await productCategories([...productIds]) : new Map<string, string>();

    const buckets = new Map<string, Bucket>();
    const add = (key: string, label: string, orderId: string, revenue: number, units: number, discounts: number) => {
        const b = buckets.get(key) ?? { key, label, orders: new Set<string>(), revenue: 0, units: 0, discounts: 0 };
        b.orders.add(orderId); b.revenue += revenue; b.units += units; b.discounts += discounts;
        buckets.set(key, b);
    };

    for (const o of orders) {
        const items: any[] = Array.isArray(o.items) ? o.items : [];
        const orderUnits = items.reduce((n, i) => n + (Number(i.quantity) || 1), 0);
        const orderDiscount = (Number(o.discount_amount) || 0) + (Number(o.auto_discount_amount) || 0);
        if (lineLevel) {
            for (const i of items) {
                const cat = cats.get(i.productId) ?? "Uncategorised";
                if (filters.category && !cat.toLowerCase().includes(filters.category.toLowerCase())) continue;
                if (filters.product && !String(i.name ?? "").toLowerCase().includes(filters.product.toLowerCase())) continue;
                const qty = Number(i.quantity) || 1;
                const line = (Number(i.price) || 0) * qty;
                let key: string, label: string;
                if (group === "product") { key = String(i.productId ?? i.name); label = String(i.name ?? "Unknown").trim(); }
                else if (group === "variant") {
                    key = [i.productId ?? i.name, i.size ?? "", i.color ?? "", i.brand ?? ""].join("|");
                    label = [String(i.name ?? "Unknown").trim(), [i.size, i.color, i.brand].filter(Boolean).join(" / ")].filter(Boolean).join(" — ");
                } else if (group === "category") { key = cat; label = cat; }
                else { const g = orderGroup(o, group, staff); key = g.key; label = g.label; }
                add(key, label, o.id, line, qty, 0);
            }
        } else {
            const g = orderGroup(o, group, staff);
            add(g.key, g.label, o.id, Number(o.total_amount) || 0, orderUnits, orderDiscount);
        }
    }
    return { buckets: [...buckets.values()], lineLevel, ordersConsidered: orders.length };
}

function orderGroup(o: any, group: Group, staff: Map<string, string>): { key: string; label: string } {
    switch (group) {
        case "staff": return o.source === "pos" ? { key: staff.get(o.id) ?? "Unknown staff", label: staff.get(o.id) ?? "Unknown staff" } : { key: "online", label: "Online (no staff member)" };
        case "channel": return { key: channelOf(o), label: channelOf(o) };
        case "payment_method": return { key: o.payment_method ?? "unknown", label: o.payment_method ?? "unknown" };
        case "day": return { key: String(o.created_at).slice(0, 10), label: String(o.created_at).slice(0, 10) };
        case "week": { const w = weekOf(String(o.created_at)); return { key: w, label: w }; }
        case "month": return { key: String(o.created_at).slice(0, 7), label: String(o.created_at).slice(0, 7) };
        case "zone": return { key: o.delivery_zone ?? "pickup / none", label: o.delivery_zone ?? "pickup / none" };
        case "discount_code": return { key: o.discount_code ?? "no code", label: o.discount_code ?? "no code" };
        case "customer": return { key: customerKey(o), label: o.customer_name || "Unknown customer" };
        default: return { key: "all", label: "all" };
    }
}

export const statsTools: ToolDef[] = [
    {
        def: {
            name: "stats",
            description:
                "Sales statistics from paid orders — the dashboard's own definition. Pick ONE measure (revenue, orders, units, average_order, discounts), group it ONE way (none, staff, product, variant = size/colour/brand, category, channel = online vs in-store, payment_method = cash/paystack/gift_card, day, week, month, zone, discount_code, customer), filter, and choose a period. Set compare_previous to compare with the period just before. Use for 'which staff sold most', 'best sellers', 'sales by category', 'cash vs online', 'busiest day', 'top customers', 'how did this month compare with last'.",
            input_schema: {
                type: "object",
                properties: {
                    measure: { type: "string", enum: [...MEASURES], description: "Default revenue." },
                    group_by: { type: "string", enum: [...GROUPS], description: "Default none (just totals)." },
                    range: { type: "string", enum: [...RANGES], description: "Default today." },
                    from: { type: "string", description: "YYYY-MM-DD, only for range=custom." },
                    to: { type: "string", description: "YYYY-MM-DD inclusive, only for range=custom." },
                    channel: { type: "string", enum: ["online", "pos"] },
                    payment_method: { type: "string", enum: ["cash", "paystack", "gift_card"] },
                    staff: { type: "string", description: "Part of a staff member's name (till sales only)." },
                    category: { type: "string", description: "Part of a category name." },
                    product: { type: "string", description: "Part of a product name." },
                    compare_previous: { type: "boolean" },
                    limit: { type: "integer", minimum: 1, maximum: 50, description: "Rows to return. Default 10." },
                },
            },
        },
        async run(input, ctx) {
            const measure: Measure = MEASURES.includes(input?.measure) ? input.measure : "revenue";
            const group: Group = GROUPS.includes(input?.group_by) ? input.group_by : "none";
            if (RESTRICTED_GROUPS.includes(group) && !(["admin", "owner"] as StaffRole[]).includes(ctx.role)) {
                return err("Rankings by staff member or by customer are for admins and owners. You can see totals by product, category, channel or day.");
            }
            const range = RANGES.includes(input?.range) ? input.range : "today";
            const b = rangeBounds(range, str(input?.from, 10), str(input?.to, 10));
            if ("error" in b) return err(b.error);
            const limit = intIn(input?.limit, 1, 50, 10);
            const filters = {
                channel: ["online", "pos"].includes(input?.channel) ? input.channel : undefined,
                payment_method: ["cash", "paystack", "gift_card"].includes(input?.payment_method) ? input.payment_method : undefined,
                staff: str(input?.staff, 60) || undefined,
                category: str(input?.category, 60) || undefined,
                product: str(input?.product, 80) || undefined,
            };
            if (filters.staff && ctx.role === "sales_staff") return err("Filtering by staff member is for admins and owners.");

            const now = await compute({ orders: await paidOrders(b.from, b.to), measure, group, filters });
            const total = now.buckets.reduce((acc, x) => {
                acc.revenue += x.revenue; acc.units += x.units; acc.discounts += x.discounts; x.orders.forEach(id => acc.orders.add(id));
                return acc;
            }, { key: "total", label: "total", orders: new Set<string>(), revenue: 0, units: 0, discounts: 0 } as Bucket);

            const rows = group === "none" ? [] : now.buckets
                .map(x => ({ label: x.label, [measure]: value(x, measure), orders: x.orders.size, ...(measure !== "units" ? { units: x.units } : {}) }))
                .sort((a: any, c: any) => c[measure] - a[measure])
                .slice(0, limit);

            let comparison: any = undefined;
            if (input?.compare_previous === true) {
                const len = b.to - b.from;
                const prev = await compute({ orders: await paidOrders(b.from - len, b.from), measure, group: "none", filters });
                const pv = prev.buckets.reduce((acc, x) => {
                    acc.revenue += x.revenue; acc.units += x.units; acc.discounts += x.discounts; x.orders.forEach(id => acc.orders.add(id));
                    return acc;
                }, { key: "p", label: "p", orders: new Set<string>(), revenue: 0, units: 0, discounts: 0 } as Bucket);
                const a = value(total, measure), p = value(pv, measure);
                comparison = {
                    previous_period: `${new Date(b.from - len).toISOString().slice(0, 10)} to ${new Date(b.from - D).toISOString().slice(0, 10)}`,
                    previous: p,
                    change: money(a - p),
                    change_pct: p ? parseFloat((((a - p) / p) * 100).toFixed(1)) : null,
                };
            }

            return ok({
                period: b.label,
                dates: `${new Date(b.from).toISOString().slice(0, 10)} to ${new Date(b.to - D).toISOString().slice(0, 10)}`,
                measure,
                group_by: group,
                filters: Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
                total: { [measure]: value(total, measure), orders: total.orders.size, units: total.units },
                ...(rows.length ? { rows, more_rows: Math.max(0, now.buckets.length - rows.length) } : {}),
                ...(comparison ? { comparison } : {}),
                notes: [
                    now.lineLevel
                        ? "Product/size/category figures use each order line's stored price × quantity, before order-level discounts, service fee and delivery."
                        : "Revenue is order totals (items after discounts, plus service fee and delivery) for paid orders.",
                    ...(group === "staff" ? ["Staff are recorded on till (POS) sales only; online orders have no staff member."] : []),
                ],
            });
        },
    },
];
