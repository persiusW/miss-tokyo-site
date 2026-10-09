// Sales reporting over paid orders — the same definition the dashboard uses
// (payment_status = 'paid', by order date, Ghana time = UTC).
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { DATE_RE, err, intIn, money, ok, str, todayUtc, type ToolDef } from "./shared";

const RANGES = ["today", "yesterday", "last_7_days", "last_30_days", "this_month", "custom"] as const;
const GROUPS = ["summary", "product", "variant", "channel", "payment_method", "day"] as const;

function rangeBounds(range: string, fromDate?: string, toDate?: string): { from: string; to: string; label: string } | { error: string } {
    const day = (d: string) => new Date(`${d}T00:00:00.000Z`).getTime();
    const iso = (t: number) => new Date(t).toISOString();
    const today = day(todayUtc());
    const D = 86_400_000;
    switch (range) {
        case "today": return { from: iso(today), to: iso(today + D), label: "today" };
        case "yesterday": return { from: iso(today - D), to: iso(today), label: "yesterday" };
        case "last_7_days": return { from: iso(today - 6 * D), to: iso(today + D), label: "the last 7 days (including today)" };
        case "last_30_days": return { from: iso(today - 29 * D), to: iso(today + D), label: "the last 30 days (including today)" };
        case "this_month": {
            const n = new Date(today);
            return { from: iso(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1)), to: iso(today + D), label: "this month so far" };
        }
        case "custom": {
            if (!fromDate || !DATE_RE.test(fromDate) || !toDate || !DATE_RE.test(toDate)) return { error: "For a custom range give from and to as YYYY-MM-DD." };
            const f = day(fromDate), t = day(toDate) + D;
            if (t <= f) return { error: "The 'to' date must be on or after the 'from' date." };
            if (t - f > 366 * D) return { error: "Custom ranges can cover at most a year." };
            return { from: iso(f), to: iso(t), label: `${fromDate} to ${toDate}` };
        }
    }
    return { error: "Unknown range." };
}

async function paidOrders(from: string, to: string): Promise<any[]> {
    const rows: any[] = [];
    for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabaseAdmin
            .from("orders")
            .select("id, created_at, total_amount, delivery_fee, items, source, payment_method")
            .eq("payment_status", "paid")
            .gte("created_at", from)
            .lt("created_at", to)
            .order("created_at")
            .range(offset, offset + 999);
        if (error) throw error;
        rows.push(...(data ?? []));
        if (!data || data.length < 1000 || rows.length >= 20000) break;
    }
    return rows;
}

const channelLabel = (s: string | null) => (s === "pos" ? "in-store (POS)" : "online");

export const salesTools: ToolDef[] = [
    {
        def: {
            name: "sales_report",
            description: "Sales from paid orders for a period: totals, best sellers by product or by size/colour, online vs in-store, cash vs online vs gift card, or day by day. Matches the dashboard's revenue (paid orders, by order date). Use for 'how much did we make', 'what sold best', 'cash today'.",
            input_schema: {
                type: "object",
                properties: {
                    range: { type: "string", enum: [...RANGES], description: "Default today." },
                    from: { type: "string", description: "YYYY-MM-DD, only for range=custom." },
                    to: { type: "string", description: "YYYY-MM-DD inclusive, only for range=custom." },
                    group_by: { type: "string", enum: [...GROUPS], description: "Default summary." },
                    limit: { type: "integer", minimum: 1, maximum: 30, description: "Rows for product/variant lists. Default 10." },
                },
            },
        },
        async run(input) {
            const range = RANGES.includes(input?.range) ? input.range : "today";
            const group = GROUPS.includes(input?.group_by) ? input.group_by : "summary";
            const limit = intIn(input?.limit, 1, 30, 10);
            const b = rangeBounds(range, str(input?.from, 10), str(input?.to, 10));
            if ("error" in b) return err(b.error);
            const orders = await paidOrders(b.from, b.to);

            const revenue = money(orders.reduce((n, o) => n + (Number(o.total_amount) || 0), 0));
            const base = {
                period: b.label,
                paid_orders: orders.length,
                revenue_ghs: revenue,
                average_order_ghs: orders.length ? money(revenue / orders.length) : 0,
                note: "Revenue is order totals (items after discounts, plus service fee and delivery) for paid orders.",
            };
            if (group === "summary" || group === "channel" || group === "payment_method") {
                const by = (key: (o: any) => string) => {
                    const m = new Map<string, { orders: number; revenue_ghs: number }>();
                    for (const o of orders) {
                        const k = key(o);
                        const cur = m.get(k) ?? { orders: 0, revenue_ghs: 0 };
                        cur.orders += 1; cur.revenue_ghs = money(cur.revenue_ghs + (Number(o.total_amount) || 0));
                        m.set(k, cur);
                    }
                    return Object.fromEntries(m);
                };
                const units = orders.reduce((n, o) => n + (Array.isArray(o.items) ? o.items.reduce((u: number, i: any) => u + (Number(i.quantity) || 1), 0) : 0), 0);
                return ok({
                    ...base,
                    units_sold: units,
                    by_channel: by(o => channelLabel(o.source)),
                    by_payment_method: by(o => o.payment_method || "unknown"),
                });
            }
            if (group === "day") {
                const m = new Map<string, { orders: number; revenue_ghs: number }>();
                for (const o of orders) {
                    const d = String(o.created_at).slice(0, 10);
                    const cur = m.get(d) ?? { orders: 0, revenue_ghs: 0 };
                    cur.orders += 1; cur.revenue_ghs = money(cur.revenue_ghs + (Number(o.total_amount) || 0));
                    m.set(d, cur);
                }
                return ok({ ...base, by_day: [...m.entries()].map(([date, v]) => ({ date, ...v })) });
            }
            // product / variant best sellers, from the stored order lines.
            const m = new Map<string, { name: string; size?: string | null; colour?: string | null; brand?: string | null; units: number; orders: Set<string>; revenue_ghs: number }>();
            for (const o of orders) {
                for (const i of Array.isArray(o.items) ? o.items : []) {
                    const qty = Number(i.quantity) || 1;
                    const key = group === "variant"
                        ? [i.productId ?? i.name, i.size ?? "", i.color ?? "", i.brand ?? ""].join("|")
                        : String(i.productId ?? i.name);
                    const cur = m.get(key) ?? {
                        name: String(i.name ?? "Unknown").trim(),
                        ...(group === "variant" ? { size: i.size || null, colour: i.color || null, brand: i.brand || null } : {}),
                        units: 0, orders: new Set<string>(), revenue_ghs: 0,
                    };
                    cur.units += qty; cur.orders.add(o.id); cur.revenue_ghs = money(cur.revenue_ghs + (Number(i.price) || 0) * qty);
                    m.set(key, cur);
                }
            }
            const top = [...m.values()]
                .sort((a, c) => c.units - a.units || c.revenue_ghs - a.revenue_ghs)
                .slice(0, limit)
                .map(({ orders: os, revenue_ghs: lineRevenue, ...rest }) => ({ ...rest, orders: os.size, line_revenue_ghs: lineRevenue }));
            return ok({
                ...base,
                best_sellers: top,
                best_sellers_note: "Ranked by units sold. Line revenue uses the price stored on each order line, before order-level discounts.",
            });
        },
    },
];
