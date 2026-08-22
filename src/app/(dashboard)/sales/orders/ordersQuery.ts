import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildSearchClause, isMissingColumn, sanitiseTerm } from "@/lib/refSearch";
// Shared with the client component. Defined in their own module because this
// one imports supabaseAdmin, which cannot be evaluated in the browser.
import { ORDER_TABS, PAYMENT_FILTERS, type OrderTab, type PaymentFilter } from "./ordersFilters";

export { ORDER_TABS, PAYMENT_FILTERS };
export type { OrderTab, PaymentFilter };

export const ORDERS_PAGE_SIZE = 100;

const ORDER_TEXT_COLUMNS = ["customer_name", "customer_email", "customer_phone", "paystack_reference"];

const ORDER_FIELDS_BASE =
    "id, customer_name, customer_email, customer_phone, total_amount, status, payment_status, paystack_reference, shipping_address, delivery_method, created_at, has_preorder, is_mixed_order, customer_metadata";

// Requested separately so a deploy landing before the cash migration falls back
// to the base list instead of failing every order query.
const ORDER_FIELDS = `${ORDER_FIELDS_BASE}, payment_method`;

/** Narrows to one payment method. Untouched when the filter is "all". */
function applyPayment<T>(query: T, payment: PaymentFilter): T {
    if (payment === "all") return query;
    return (query as any).eq("payment_method", payment);
}

/**
 * Inclusive calendar-day range on created_at.
 *
 * `to` is pushed to the end of that day: staff picking 22 Aug -> 22 Aug mean
 * everything that happened that day, not the single instant of midnight.
 */
function applyDateRange<T>(query: T, from?: string, to?: string): T {
    let q = query as any;
    if (from) q = q.gte("created_at", new Date(`${from}T00:00:00.000Z`).toISOString());
    if (to) q = q.lte("created_at", new Date(`${to}T23:59:59.999Z`).toISOString());
    return q;
}

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

function applySearch<T>(query: T, search: string, includeRef = true): T {
    const q = sanitiseTerm(search);
    if (!q) return query;
    // `ref` is the generated uppercase 8-char prefix of the id — the ref shown
    // on screen. Before it existed this search could not match an order by the
    // one identifier staff actually read out (id is a uuid and takes no ilike).
    return (query as any).or(buildSearchClause(q, ORDER_TEXT_COLUMNS, { includeRef }));
}

export type OrdersPage = {
    orders: any[];
    tab: OrderTab;
    search: string;
    payment: PaymentFilter;
    dateFrom: string;
    dateTo: string;
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
    opts: { payment?: PaymentFilter; dateFrom?: string; dateTo?: string } = {},
): Promise<OrdersPage> {
    const payment = opts.payment ?? "all";
    const dateFrom = opts.dateFrom ?? "";
    const dateTo = opts.dateTo ?? "";
    const searchActive = search.trim().length > 0;
    const from = (page - 1) * ORDERS_PAGE_SIZE;
    const to = from + ORDERS_PAGE_SIZE - 1;

    // List query for the active tab. A search on Inbox spans all statuses.
    const buildList = (includeRef: boolean, includePaymentColumn: boolean) => {
        let lq = supabaseAdmin
            .from("orders")
            .select(includePaymentColumn ? ORDER_FIELDS : ORDER_FIELDS_BASE, { count: "exact" })
            .or(ONLINE_FILTER);
        if (!(tab === "all" && searchActive)) lq = applyTabStatus(lq, tab);
        lq = applySearch(lq, search, includeRef);
        if (includePaymentColumn) lq = applyPayment(lq, payment);
        lq = applyDateRange(lq, dateFrom, dateTo);
        return lq.order("created_at", { ascending: false }).range(from, to);
    };

    // Per-tab counts (head-only, cheap). Counts respect the active search so the
    // badges reflect what a tab would show for the current query.
    const countFor = (t: OrderTab, includeRef: boolean, includePaymentColumn: boolean) => {
        let cq = supabaseAdmin
            .from("orders")
            .select("id", { count: "exact", head: true })
            .or(ONLINE_FILTER);
        cq = applyTabStatus(cq, t);
        cq = applySearch(cq, search, includeRef);
        // Badges must agree with the list, so they carry the same filters.
        if (includePaymentColumn) cq = applyPayment(cq, payment);
        cq = applyDateRange(cq, dateFrom, dateTo);
        return cq;
    };

    const tabKeys = ORDER_TABS.map(t => t.key);

    // A deploy can land before the migration that adds `ref`. Naming a missing
    // column fails the whole or(), so fall back to searching without it rather
    // than taking every order search down.
    const runAll = async (includeRef: boolean, includePaymentColumn: boolean) => {
        const [list, ...counts] = await Promise.all([
            buildList(includeRef, includePaymentColumn),
            ...tabKeys.map(k => countFor(k, includeRef, includePaymentColumn)),
        ]);
        return { list, counts };
    };

    let { list, counts: countResults } = await runAll(true, true);

    // Same guard as `ref` below: the cash migration may not have landed yet, and
    // a missing column must not take the whole orders page down.
    if (isMissingColumn((list as any).error, "payment_method")) {
        console.warn("[orders] `payment_method` column missing — payment filter disabled. Apply 20260822090000_cash_payments.sql.");
        ({ list, counts: countResults } = await runAll(true, false));
    }
    if (searchActive && isMissingColumn((list as any).error, "ref")) {
        console.warn("[orders] `ref` column missing — searching without it. Apply 20260821010000_searchable_display_refs.sql.");
        ({ list, counts: countResults } = await runAll(false, true));
    }
    const { data: orders, count } = list as any;

    const tabCounts = {} as Record<OrderTab, number>;
    tabKeys.forEach((k, i) => {
        tabCounts[k] = countResults[i].count ?? 0;
    });

    return {
        orders: orders ?? [],
        tab,
        search,
        payment,
        dateFrom,
        dateTo,
        page,
        pageSize: ORDERS_PAGE_SIZE,
        totalCount: count ?? 0,
        tabCounts,
    };
}
