/**
 * Shared server-side data-fetching utilities for dashboard metrics.
 * Single source of truth — import these into any dashboard page instead of
 * writing inline Supabase queries.
 *
 * Revenue definition: orders WHERE status IN ('paid', 'processing', 'fulfilled', 'delivered')
 * Explicitly excluded: 'pending', 'cancelled', 'refunded'
 */

import { supabase } from "@/lib/supabase";

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
        .select("total_amount")
        .in("status", [...REVENUE_STATUSES]);

    if (error) {
        console.error("[metrics] fetchTotalRevenue:", error.message, error.details);
        return 0;
    }

    return (data || []).reduce((sum, o) => sum + Number(o.total_amount ?? 0), 0);
}

/**
 * Full order statistics including counts per status and derived rates.
 * Single DB round-trip — fetches all orders and derives every stat in JS.
 */
export async function fetchOrderStats(): Promise<OrderStats> {
    const { data, error } = await supabase
        .from("orders")
        .select("id, total_amount, status");

    if (error) {
        console.error("[metrics] fetchOrderStats:", error.message, error.details);
        return {
            totalRevenue: 0,
            revenueOrderCount: 0,
            pendingCount: 0,
            processingCount: 0,
            fulfilledCount: 0,
            cancelledCount: 0,
            totalOrders: 0,
            avgOrderValue: 0,
            conversionRate: "0.0",
        };
    }

    const orders = data ?? [];
    const revenueOrders = orders.filter(o =>
        REVENUE_STATUSES.includes(o.status as RevenueStatus)
    );
    const totalRevenue = revenueOrders.reduce(
        (sum, o) => sum + Number(o.total_amount ?? 0), 0
    );
    const revenueOrderCount = revenueOrders.length;
    const totalOrders = orders.length;

    return {
        totalRevenue,
        revenueOrderCount,
        pendingCount: orders.filter(o => o.status === "pending").length,
        processingCount: orders.filter(o => o.status === "processing").length,
        fulfilledCount: orders.filter(o =>
            ["fulfilled", "delivered"].includes(o.status)
        ).length,
        cancelledCount: orders.filter(o =>
            ["cancelled", "refunded"].includes(o.status)
        ).length,
        totalOrders,
        avgOrderValue: revenueOrderCount > 0 ? totalRevenue / revenueOrderCount : 0,
        conversionRate: totalOrders > 0
            ? ((revenueOrderCount / totalOrders) * 100).toFixed(1)
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
            .select("items, total_amount")
            .in("status", [...REVENUE_STATUSES]),
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

    const categoryRevenue: Record<string, number> = {};

    for (const order of (ordersRes.data ?? [])) {
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
    const { data, error } = await supabase
        .from("orders")
        .select("total_amount, created_at")
        .in("status", [...REVENUE_STATUSES])
        .order("created_at", { ascending: true });

    if (error) {
        console.error("[metrics] fetchMonthlyRevenue:", error.message, error.details);
    }

    const orders = data ?? [];
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
