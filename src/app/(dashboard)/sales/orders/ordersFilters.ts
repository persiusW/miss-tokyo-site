// Client-safe filter definitions for the orders list.
//
// These live apart from ordersQuery.ts on purpose. That module imports
// supabaseAdmin, which builds a client from SUPABASE_SERVICE_ROLE_KEY at module
// scope. A "use client" component importing anything from it — even a plain
// constant — pulls the whole module into the browser bundle, where the key does
// not exist, so it throws "supabaseKey is required" during module evaluation
// and takes the page down before it renders.
//
// Nothing in this file may import server-only code.

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

export type PaymentFilter = "all" | "cash" | "paystack" | "gift_card";

export const PAYMENT_FILTERS: { key: PaymentFilter; label: string }[] = [
    { key: "all", label: "All payments" },
    { key: "cash", label: "Cash" },
    { key: "paystack", label: "Card / Mobile money" },
    { key: "gift_card", label: "Gift card" },
];
