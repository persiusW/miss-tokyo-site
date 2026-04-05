/**
 * Shared server-side data-fetching utilities for dashboard metrics.
 * Single source of truth — import these into any dashboard page instead of
 * writing inline Supabase queries.
 *
 * Revenue definition: orders WHERE status IN ('paid', 'processing', 'fulfilled', 'delivered')
 * Explicitly excluded: 'pending', 'cancelled', 'refunded'
 */

import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";

// Canonical revenue-qualifying statuses
export const REVENUE_STATUSES = ["paid", "processing", "fulfilled", "delivered"] as const;
export type RevenueStatus = (typeof REVENUE_STATUSES)[number];

// ─── Types ──────────────────────────────────────────────────────────────────

export type OrderStats = {
    totalRevenue: number;
    revenueOrderCount: number;   // orders in REVENUE_STATUSES
    pendingCount: number;
    processingCount: number;
    fulfilledCount: number;      // fulfilled + delivered
    cancelledCount: number;      // cancelled + refunded
    totalOrders: number;
    avgOrderValue: number;
    conversionRate: string;      // revenueOrderCount / totalOrders as "XX.X%"
};

export type CategoryRevenue = {
    category: string;
    revenue: number;
};

export type MonthlyRevenue = {
    label: string;   // e.g. "Jan '26"
    revenue: number;
    month: number;
    year: number;
};

export type RecentActivity = {
    id: string;
    type: "order" | "custom_request";
    label: string;
    sub: string;
    status: string;
    created_at: string;
};

// ─── Functions ───────────────────────────────────────────────────────────────

/**
 * Total confirmed revenue — excludes pending, cancelled, refunded.
 */
export async function fetchTotalRevenue(): Promise<number> {
    const { data, error } = await supabase
        .from("orders")
        .select("total_amount, status, payment_status");

    if (error) {
        console.error("[metrics] fetchTotalRevenue:", error.message, error.details);
        return 0;
    }

    const LEGACY_PAID = ["paid", "processing", "fulfilled", "delivered", "packed", "ready_for_pickup", "shipped"];
    return (data || [])
        .filter(o => o.payment_status === "paid" || (!o.payment_status && LEGACY_PAID.includes(o.status ?? "")))
        .reduce((sum, o) => sum + Number(o.total_amount ?? 0), 0);
}

/**
 * Full order statistics including counts per status and derived rates.
 * Revenue + paid count: DB-side aggregate via get_order_stats() RPC.
 * Status breakdown: lightweight status-only query (no amount columns fetched).
 */
export async function fetchOrderStats(): Promise<OrderStats> {
    const { data, error } = await supabase
        .from("orders")
        .select("status, payment_status, fulfillment_status, total_amount");

    if (error) {
        console.error("[metrics] fetchOrderStats:", error.message, error.details);
    }

    const orders = (data ?? []) as {
        status: string;
        payment_status: string | null;
        fulfillment_status: string | null;
        total_amount: number | null;
    }[];

    const totalOrders = orders.length;

    // Revenue: prefer payment_status='paid'; fall back to legacy status for orders
    // created before the dual-status migration (payment_status may still be null).
    const LEGACY_PAID = ["paid", "processing", "fulfilled", "delivered", "packed", "ready_for_pickup", "shipped"];
    const paidOrders = orders.filter(o =>
        o.payment_status === "paid" ||
        (!o.payment_status && LEGACY_PAID.includes(o.status))
    );
    const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total_amount ?? 0), 0);
    const revenueOrderCount = paidOrders.length;

    // Paid but not yet delivered
    const unfulfilledPaidCount = paidOrders.filter(o =>
        o.fulfillment_status !== "delivered"
    ).length;

    // Delivered orders
    const fulfilledCount = orders.filter(o =>
        o.fulfillment_status === "delivered" || ["fulfilled", "delivered"].includes(o.status)
    ).length;

    return {
        totalRevenue,
        revenueOrderCount,
        pendingCount: unfulfilledPaidCount,
        processingCount: 0,
        fulfilledCount,
        cancelledCount: orders.filter(o =>
            ["cancelled", "refunded"].includes(o.status)
        ).length,
        totalOrders,
        avgOrderValue: revenueOrderCount > 0 ? totalRevenue / revenueOrderCount : 0,
        conversionRate: totalOrders > 0
            ? ((fulfilledCount / totalOrders) * 100).toFixed(1)
            : "0.0",
    };
}

/**
 * Revenue attributed to each product category.
 * Parses orders.items (jsonb) and joins against products.category_type.
 * Proportionally splits order total by line-item value when items exist.
 */
export async function fetchSalesByCategory(): Promise<CategoryRevenue[]> {
    const [ordersRes, productsRes] = await Promise.all([
        supabase
            .from("orders")
            .select("items, total_amount, status, payment_status"),
        supabase
            .from("products")
            .select("id, category_type"),
    ]);

    if (ordersRes.error) {
        console.error("[metrics] fetchSalesByCategory (orders):", ordersRes.error.message, ordersRes.error.details);
    }
    if (productsRes.error) {
        console.error("[metrics] fetchSalesByCategory (products):", productsRes.error.message, productsRes.error.details);
    }

    // Build productId → category lookup
    const catMap: Record<string, string> = {};
    for (const p of (productsRes.data ?? [])) {
        catMap[p.id] = p.category_type?.trim() || "Uncategorised";
    }

    const LEGACY_PAID = ["paid", "processing", "fulfilled", "delivered", "packed", "ready_for_pickup", "shipped"];
    const paidOrders = (ordersRes.data ?? []).filter((o: any) =>
        o.payment_status === "paid" || (!o.payment_status && LEGACY_PAID.includes(o.status ?? ""))
    );

    const categoryRevenue: Record<string, number> = {};

    for (const order of paidOrders) {
        const items: any[] = Array.isArray(order.items) ? order.items : [];
        const orderAmt = Number(order.total_amount ?? 0);

        if (items.length === 0) {
            // No line-item data — attribute entire order to Uncategorised
            categoryRevenue["Uncategorised"] =
                (categoryRevenue["Uncategorised"] ?? 0) + orderAmt;
            continue;
        }

        // Proportionally attribute by line-item subtotal
        const lineSum = items.reduce(
            (s: number, item: any) => s + Number(item.price ?? 0) * Number(item.quantity ?? 1),
            0
        );

        for (const item of items) {
            const cat = catMap[item.productId] ?? "Uncategorised";
            const lineAmt = Number(item.price ?? 0) * Number(item.quantity ?? 1);
            const proportion = lineSum > 0 ? lineAmt / lineSum : 1 / items.length;
            categoryRevenue[cat] = (categoryRevenue[cat] ?? 0) + orderAmt * proportion;
        }
    }

    return Object.entries(categoryRevenue)
        .map(([category, revenue]) => ({ category, revenue }))
        .sort((a, b) => b.revenue - a.revenue);
}

/**
 * Monthly revenue grouped by calendar month for the last N months.
 * Only counts revenue-qualifying orders.
 */
export async function fetchMonthlyRevenue(monthsBack = 6): Promise<MonthlyRevenue[]> {
    const since = new Date();
    since.setMonth(since.getMonth() - monthsBack);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
        .from("orders")
        .select("total_amount, created_at, status, payment_status")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true });

    if (error) {
        console.error("[metrics] fetchMonthlyRevenue:", error.message, error.details);
    }

    const LEGACY_PAID = ["paid", "processing", "fulfilled", "delivered", "packed", "ready_for_pickup", "shipped"];
    const orders = (data ?? []).filter((o: any) =>
        o.payment_status === "paid" || (!o.payment_status && LEGACY_PAID.includes(o.status ?? ""))
    );
    const now = new Date();

    return Array.from({ length: monthsBack }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1 - i), 1);
        const revenue = orders
            .filter(o => {
                const od = new Date(o.created_at);
                return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear();
            })
            .reduce((sum, o) => sum + Number(o.total_amount ?? 0), 0);

        return {
            label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
            revenue,
            month: d.getMonth(),
            year: d.getFullYear(),
        };
    });
}

/**
 * Last N activity items merged from orders and custom_requests, sorted newest first.
 */
export async function fetchRecentActivity(limit = 5): Promise<RecentActivity[]> {
    const [ordersRes, requestsRes] = await Promise.all([
        supabase
            .from("orders")
            .select("id, customer_name, customer_email, status, total_amount, created_at")
            .order("created_at", { ascending: false })
            .limit(limit),
        supabase
            .from("custom_requests")
            .select("id, customer_name, customer_email, status, created_at")
            .order("created_at", { ascending: false })
            .limit(limit),
    ]);

    if (ordersRes.error) {
        console.error("[metrics] fetchRecentActivity (orders):", ordersRes.error.message);
    }
    if (requestsRes.error) {
        console.error("[metrics] fetchRecentActivity (requests):", requestsRes.error.message);
    }

    const items: RecentActivity[] = [
        ...(ordersRes.data ?? []).map(o => ({
            id: o.id,
            type: "order" as const,
            label: o.customer_name || o.customer_email || "A customer",
            sub: `GH₵ ${Number(o.total_amount ?? 0).toFixed(2)}`,
            status: o.status,
            created_at: o.created_at,
        })),
        ...(requestsRes.data ?? []).map(r => ({
            id: r.id,
            type: "custom_request" as const,
            label: r.customer_name || r.customer_email || "A client",
            sub: "Custom request",
            status: r.status || "inquiry",
            created_at: r.created_at,
        })),
    ];

    return items
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit);
}
