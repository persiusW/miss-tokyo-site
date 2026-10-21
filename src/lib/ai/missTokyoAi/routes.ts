// The only pages Miss Tokyo AI may send staff to. Roles mirror the real gates
// (sidebar + any page/server checks); tests compare them with both side menus
// and the page guards.
//
// Two tables during the admin v2 rollout: ROUTES are the old admin's pages,
// V2_ROUTES the new admin's. Each route belongs to one area
// (lib/admin/v2/routeMap.ts); for a given view an area's routes come from
// exactly one table (routeTable), so the assistant only ever names and links
// the pages this person can see. Old paths still redirect forward while an
// area is on, and new paths back while it is off.
import type { V2Area } from "@/lib/admin/v2/routeMap";
import { OLD_VIEW, isOn, type AdminView } from "@/lib/ai/missTokyoAi/view";

export type StaffRole = "admin" | "owner" | "sales_staff";

const ALL: StaffRole[] = ["admin", "owner", "sales_staff"];
const FULL: StaffRole[] = ["admin", "owner"];
const ADMIN: StaffRole[] = ["admin"];

export const SETTINGS_TABS = [
    "business", "store", "shipping", "cms", "seo", "emails", "notifications", "riders", "size-guide", "product-page",
] as const;

/** New Settings sections an owner or admin can open, /settings/<key>. "Site content"
 *  only shows while Content is off, so it never appears with the new admin. */
export const V2_SETTINGS_SECTIONS = [
    "profile", "location", "policies", "checkout", "payments", "delivery", "taxes", "wholesale",
    "accounts", "notifications", "assistants", "domain", "status", "pages", "layout", "options", "seo",
    "team", "money", "rollout",
] as const;

/** Analytics reports, opened with /analytics?report=<key>. */
export const V2_REPORTS = [
    "product", "variant", "channel", "discounts", "payments", "riders", "cash", "writeoffs", "customers", "timing", "regions",
] as const;

export type RouteDef = {
    path: string;
    title: string;
    roles: StaffRole[];
    /** The rollout area the page belongs to; null for pages in both admins. */
    area: V2Area | null;
    tabs?: readonly string[];
    /** How a tab is added: ?tab=<t> (old Settings), /<t> (new Settings), ?report=<t> (Analytics). */
    tabStyle?: "query" | "segment" | "report";
};

export const ROUTES = {
    overview: { path: "/overview", title: "Dashboard", roles: ALL, area: "home" },
    analytics: { path: "/sales/analytics", title: "Analytics", roles: ALL, area: "analytics" },
    pos: { path: "/pos", title: "Point of Sale", roles: ALL, area: "till" },
    pos_history: { path: "/pos/history", title: "POS History", roles: ALL, area: "till" },
    orders: { path: "/sales/orders", title: "Orders", roles: ALL, area: "orders" },
    pre_orders: { path: "/sales/pre-orders", title: "Pre-Orders", roles: ALL, area: "orders" },
    abandoned: { path: "/customers/abandoned", title: "Abandoned Carts", roles: ALL, area: "orders" },
    riders: { path: "/sales/riders", title: "Riders", roles: ALL, area: "analytics" },
    wholesalers: { path: "/sales/wholesalers", title: "Wholesale customers", roles: FULL, area: "customers" },
    discounts: { path: "/catalog/discounts", title: "Discounts", roles: ALL, area: "discounts" },
    auto_discounts: { path: "/catalog/auto-discounts", title: "Auto Discounts", roles: ALL, area: "discounts" },
    gift_cards: { path: "/catalog/gift-cards", title: "Gift Cards", roles: ALL, area: "products" },
    products: { path: "/catalog/products", title: "Products", roles: ALL, area: "products" },
    product_new: { path: "/catalog/products/new", title: "New Product", roles: ALL, area: "products" },
    low_stock: { path: "/catalog/products/low-stock", title: "Low Stock", roles: ALL, area: "products" },
    categories: { path: "/catalog/categories", title: "Categories", roles: ALL, area: "products" },
    contacts: { path: "/customers", title: "Customers", roles: ALL, area: "customers" },
    whatsapp: { path: "/customers/whatsapp", title: "Inbox (WhatsApp chats)", roles: ALL, area: "inbox" },
    whatsapp_teach: { path: "/customers/whatsapp/teach", title: "Teach the assistant", roles: FULL, area: "inbox" },
    forms: { path: "/customers/forms", title: "Inbox (contact forms)", roles: ALL, area: "inbox" },
    custom_requests: { path: "/customers/requests", title: "Inbox (custom requests)", roles: ALL, area: "inbox" },
    pay_links: { path: "/finance/links", title: "Pay Links", roles: FULL, area: "orders" },
    invoices: { path: "/finance/invoices", title: "Invoices", roles: FULL, area: "orders" },
    settings: { path: "/settings", title: "Site Settings", roles: FULL, area: "settings", tabs: SETTINGS_TABS, tabStyle: "query" },
    team: { path: "/team", title: "Team", roles: FULL, area: "staff" },
    ai_settings: { path: "/settings/ai", title: "AI Settings", roles: FULL, area: "settings" },
    ai_inbox: { path: "/ai/inbox", title: "Inbox (questions for admin)", roles: ADMIN, area: "inbox" },
    assistant: { path: "/agent", title: "Miss Tokyo AI", roles: ALL, area: null },
} satisfies Record<string, RouteDef>;

// Titles are the new side menu's and tabs' own labels. Paths may carry the
// query a tab or chip reads; the page file is the part before "?".
export const V2_ROUTES = {
    home: { path: "/home", title: "Home", roles: ALL, area: "home" },
    inbox: { path: "/inbox", title: "Inbox", roles: ALL, area: "inbox" },
    inbox_teach: { path: "/inbox/teach", title: "Teach the assistant", roles: FULL, area: "inbox" },
    inbox_forms: { path: "/inbox?f=form", title: "Inbox › Contact form", roles: ALL, area: "inbox" },
    inbox_requests: { path: "/inbox?f=request", title: "Inbox › Custom requests", roles: ALL, area: "inbox" },
    inbox_questions: { path: "/inbox?f=ai", title: "Inbox › Questions for admin", roles: ADMIN, area: "inbox" },
    orders: { path: "/orders", title: "Orders", roles: ALL, area: "orders" },
    pre_orders: { path: "/orders?preorder=1", title: "Orders › Pre-orders only", roles: ALL, area: "orders" },
    abandoned: { path: "/orders/abandoned", title: "Abandoned checkouts", roles: ALL, area: "orders" },
    invoices: { path: "/orders/invoices", title: "Invoices and pay links", roles: FULL, area: "orders" },
    till: { path: "/till", title: "POS", roles: ALL, area: "till" },
    till_today: { path: "/till/today", title: "Today's sales", roles: ALL, area: "till" },
    catalogue: { path: "/catalogue", title: "Products", roles: ALL, area: "products" },
    product_new: { path: "/catalogue/new", title: "Add product", roles: ALL, area: "products" },
    inventory: { path: "/catalogue/inventory", title: "Inventory", roles: ALL, area: "products" },
    low_stock: { path: "/catalogue/inventory?view=low", title: "Inventory › Running low", roles: ALL, area: "products" },
    categories: { path: "/catalogue/categories", title: "Categories", roles: ALL, area: "products" },
    gift_cards: { path: "/catalogue/gift-cards", title: "Gift cards", roles: ALL, area: "products" },
    customers: { path: "/customers", title: "Customers", roles: ALL, area: "customers" },
    wholesale: { path: "/customers?segment=wholesale", title: "Customers › Wholesale", roles: ALL, area: "customers" },
    discounts: { path: "/discounts", title: "Discounts", roles: ALL, area: "discounts" },
    auto_discounts: { path: "/discounts?type=auto", title: "Discounts › Automatic", roles: ALL, area: "discounts" },
    content: { path: "/content", title: "Content › Home page", roles: FULL, area: "content" },
    content_pages: { path: "/content/pages", title: "Content › Pages", roles: FULL, area: "content" },
    content_menu: { path: "/content/menu", title: "Content › Menu", roles: FULL, area: "content" },
    content_reviews: { path: "/content/reviews", title: "Content › Reviews", roles: FULL, area: "content" },
    content_wording: { path: "/content/text", title: "Content › Shop wording", roles: FULL, area: "content" },
    analytics: { path: "/analytics", title: "Analytics", roles: ALL, area: "analytics", tabs: V2_REPORTS, tabStyle: "report" },
    staff: { path: "/staff", title: "Staff", roles: FULL, area: "staff" },
    staff_invites: { path: "/staff/invites", title: "Staff › Invites", roles: FULL, area: "staff" },
    staff_roles: { path: "/staff/permissions", title: "Staff › What each role can do", roles: FULL, area: "staff" },
    staff_activity: { path: "/staff/activity", title: "Staff › Activity", roles: FULL, area: "staff" },
    billing: { path: "/billing", title: "Billing", roles: FULL, area: "billing" },
    tools: { path: "/tools", title: "Admin tools", roles: ADMIN, area: "tools" },
    settings: { path: "/settings", title: "Settings", roles: FULL, area: "settings", tabs: V2_SETTINGS_SECTIONS, tabStyle: "segment" },
    account: { path: "/settings/account", title: "Your account", roles: ALL, area: "settings" },
} satisfies Record<string, RouteDef>;

export type LegacyRouteKey = keyof typeof ROUTES;
export type V2RouteKey = keyof typeof V2_ROUTES;
export type RouteKey = LegacyRouteKey | V2RouteKey;

/** The pages this view shows: old pages for areas that are off, new pages for areas that are on. */
export function routeTable(view: AdminView = OLD_VIEW): Record<string, RouteDef> {
    const out: Record<string, RouteDef> = {};
    for (const [k, r] of Object.entries(ROUTES) as [string, RouteDef][]) if (!isOn(view, r.area)) out[k] = r;
    for (const [k, r] of Object.entries(V2_ROUTES) as [string, RouteDef][]) if (isOn(view, r.area)) out[k] = r;
    return out;
}

export function findRoute(key: string, view: AdminView = OLD_VIEW): RouteDef | null {
    const table = routeTable(view);
    return Object.prototype.hasOwnProperty.call(table, key) ? table[key] : null;
}

export function routeAllowed(key: string, role: StaffRole, view: AdminView = OLD_VIEW): boolean {
    return !!findRoute(key, view)?.roles.includes(role);
}

export function routesFor(role: StaffRole, view: AdminView = OLD_VIEW): string[] {
    return Object.entries(routeTable(view)).filter(([, r]) => r.roles.includes(role)).map(([k]) => k);
}

/** Every tab value any page in this view accepts (the navigate_to enum). */
export function tabsFor(view: AdminView = OLD_VIEW): string[] {
    return [...new Set(Object.values(routeTable(view)).flatMap(r => [...(r.tabs ?? [])]))];
}

/** The address of a page, with a tab when the page has that tab; null when it hasn't. */
export function routeHref(route: RouteDef, tab?: string | null): string | null {
    if (!tab) return route.path;
    if (!route.tabs?.includes(tab)) return null;
    const t = encodeURIComponent(tab);
    if (route.tabStyle === "segment") return `${route.path}/${t}`;
    const key = route.tabStyle === "report" ? "report" : "tab";
    return `${route.path}${route.path.includes("?") ? "&" : "?"}${key}=${t}`;
}
