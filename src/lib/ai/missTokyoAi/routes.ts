// The only pages Miss Tokyo AI may send staff to. Roles mirror the real gates
// (sidebar + any page/server checks); tests compare this with the sidebar.
export type StaffRole = "admin" | "owner" | "sales_staff";

const ALL: StaffRole[] = ["admin", "owner", "sales_staff"];
const FULL: StaffRole[] = ["admin", "owner"];

export const SETTINGS_TABS = [
    "business", "store", "shipping", "cms", "seo", "emails", "notifications", "riders", "size-guide", "product-page",
] as const;

type RouteDef = { path: string; title: string; roles: StaffRole[]; tabs?: readonly string[] };

export const ROUTES = {
    overview: { path: "/overview", title: "Dashboard", roles: ALL },
    analytics: { path: "/sales/analytics", title: "Analytics", roles: ALL },
    pos: { path: "/pos", title: "Point of Sale", roles: ALL },
    pos_history: { path: "/pos/history", title: "POS History", roles: ALL },
    orders: { path: "/sales/orders", title: "Orders", roles: ALL },
    pre_orders: { path: "/sales/pre-orders", title: "Pre-Orders", roles: ALL },
    abandoned: { path: "/customers/abandoned", title: "Abandoned Carts", roles: ALL },
    riders: { path: "/sales/riders", title: "Riders", roles: ALL },
    wholesalers: { path: "/sales/wholesalers", title: "Wholesalers", roles: FULL },
    discounts: { path: "/catalog/discounts", title: "Discounts", roles: ALL },
    auto_discounts: { path: "/catalog/auto-discounts", title: "Auto Discounts", roles: ALL },
    gift_cards: { path: "/catalog/gift-cards", title: "Gift Cards", roles: ALL },
    products: { path: "/catalog/products", title: "Products", roles: ALL },
    product_new: { path: "/catalog/products/new", title: "New Product", roles: ALL },
    low_stock: { path: "/catalog/products/low-stock", title: "Low Stock", roles: ALL },
    categories: { path: "/catalog/categories", title: "Categories", roles: ALL },
    contacts: { path: "/customers", title: "Contact List", roles: ALL },
    forms: { path: "/customers/forms", title: "Form Submissions", roles: ALL },
    custom_requests: { path: "/customers/requests", title: "Custom Requests", roles: ALL },
    pay_links: { path: "/finance/links", title: "Pay Links", roles: FULL },
    invoices: { path: "/finance/invoices", title: "Invoices", roles: FULL },
    settings: { path: "/settings", title: "Site Settings", roles: FULL, tabs: SETTINGS_TABS },
    team: { path: "/team", title: "Team", roles: FULL },
    ai_settings: { path: "/settings/ai", title: "AI Settings", roles: FULL },
    assistant: { path: "/agent", title: "Miss Tokyo AI", roles: ALL },
} satisfies Record<string, RouteDef>;

export type RouteKey = keyof typeof ROUTES;

export function routeAllowed(key: RouteKey, role: StaffRole): boolean {
    return (ROUTES[key].roles as StaffRole[]).includes(role);
}

export function routesFor(role: StaffRole): RouteKey[] {
    return (Object.keys(ROUTES) as RouteKey[]).filter(k => routeAllowed(k, role));
}
