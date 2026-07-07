import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const ORDERS_PAGE_SIZE = 100;

export type OrderTab =
    | "all" | "packed" | "pickups" | "shipped" | "fulfilled" | "cancelled" | "refunded" | "all-orders";

export const ORDER_TABS: { key: OrderTab; label: string }[] = [
    { key: "all", label: "Inbox" },
    { key: "packed", label: "Packed" },
    { key: "pickups", label: "Pickups" },
    { key: "shipped", label: "Shipped" },
    { key: "fulfilled", label: "Fulfilled" },
    { key: "cancelled", label: "Cancelled" },
    { key: "refunded", label: "Refunds" },
    { key: "all-orders", label: "All" },
];

const ORDER_FIELDS =
    "id, customer_name, customer_email, customer_phone, total_amount, status, payment_status, paystack_reference, shipping_address, delivery_method, created_at, has_preorder, is_mixed_order, customer_metadata";

// Online orders only — pure pre-orders live on the pre-orders page.
const ONLINE_FILTER = "has_preorder.eq.false,is_mixed_order.eq.true";

// Applies the status filter that each tab represents. Returns the builder for chaining.
function applyTabStatus<T>(query: T, tab: OrderTab): T {
    const q = query as any;
    switch (tab) {
        case "all":        return q.eq("status", "paid");
        case "packed":     return q.eq("status", "packed");
        case "pickups":    return q.eq("status", "ready_for_pickup");
        case "shipped":    return q.eq("status", "shipped");
        case "fulfilled":  return q.in("status", ["fulfilled", "delivered"]);
        case "cancelled":  return q.in("status", ["cancelled", "failed"]);
        case "refunded":   return q.eq("status", "refunded");
        case "all-orders": return q;
        default:           return q;
    }
}

function applySearch<T>(query: T, search: string): T {
    const q = search.trim().replace(/[%,()]/g, "");
    if (!q) return query;
    // Text columns only — id is a uuid and can't take ilike.
    return (query as any).or(
        `customer_name.ilike.%${q}%,customer_email.ilike.%${q}%,customer_phone.ilike.%${q}%,paystack_reference.ilike.%${q}%`
    );
}

export type OrdersPage = {
    orders: any[];
    tab: OrderTab;
    search: string;
    page: number;
    pageSize: number;
    totalCount: number;
    tabCounts: Record<OrderTab, number>;
};

/**
 * Fetches one page of orders plus per-tab counts, all server-side.
 * When searching, the Inbox ("all") tab widens to every status (matches the
 * previous client behaviour where a search spanned all statuses).
 */
export async function fetchOrdersPage(
    tab: OrderTab,
    search: string,
    page: number,
): Promise<OrdersPage> {
    const searchActive = search.trim().length > 0;
    const from = (page - 1) * ORDERS_PAGE_SIZE;
    const to = from + ORDERS_PAGE_SIZE - 1;

    // List query for the active tab. A search on Inbox spans all statuses.
    let listQuery = supabaseAdmin
        .from("orders")
        .select(ORDER_FIELDS, { count: "exact" })
        .or(ONLINE_FILTER);
    if (!(tab === "all" && searchActive)) {
        listQuery = applyTabStatus(listQuery, tab);
    }
    listQuery = applySearch(listQuery, search);
    listQuery = listQuery.order("created_at", { ascending: false }).range(from, to);

    // Per-tab counts (head-only, cheap). Counts respect the active search so the
    // badges reflect what a tab would show for the current query.
    const countFor = (t: OrderTab) => {
        let cq = supabaseAdmin
            .from("orders")
            .select("id", { count: "exact", head: true })
            .or(ONLINE_FILTER);
        cq = applyTabStatus(cq, t);
        cq = applySearch(cq, search);
        return cq;
    };

    const tabKeys = ORDER_TABS.map(t => t.key);
    const [{ data: orders, count }, ...countResults] = await Promise.all([
        listQuery,
        ...tabKeys.map(countFor),
    ]);

    const tabCounts = {} as Record<OrderTab, number>;
    tabKeys.forEach((k, i) => {
        tabCounts[k] = countResults[i].count ?? 0;
    });

    return {
        orders: orders ?? [],
        tab,
        search,
        page,
        pageSize: ORDERS_PAGE_SIZE,
        totalCount: count ?? 0,
        tabCounts,
    };
}
