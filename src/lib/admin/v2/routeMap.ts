// Old admin URLs ↔ new admin URLs, for the admin v2 rollout.
//
// While a switch is off the new page sends people back to the old one, and
// while it's on the old page sends them forward, so bookmarks, deep links from
// emails and Miss Tokyo AI's routes keep working either way. Pure and
// edge-safe: proxy.ts calls it on every dashboard request.
//
// The storefront owns /products/[slug], so the admin's Products area lives at
// /catalogue instead of the /products the design handoff suggested.

export type V2Area =
    | "home" | "inbox" | "orders" | "till" | "products" | "customers" | "discounts"
    | "content" | "analytics" | "staff" | "billing" | "settings";

export type V2Flags = {
    admin_v2: boolean;
    admin_v2_products: boolean;
    admin_v2_orders: boolean;
    admin_v2_till: boolean;
};

export const FLAGS_OFF: V2Flags = { admin_v2: false, admin_v2_products: false, admin_v2_orders: false, admin_v2_till: false };
export const FLAGS_ALL: V2Flags = { admin_v2: true, admin_v2_products: true, admin_v2_orders: true, admin_v2_till: true };

/** Areas whose new pages exist. An area joins this list in the PR that builds it,
 *  so a switch can never send anyone to a page that isn't there yet. */
export const V2_READY_AREAS: readonly V2Area[] = ["settings", "home", "inbox", "content", "customers", "discounts", "analytics", "staff"];

export function areaOn(area: V2Area, flags: V2Flags, ready: readonly V2Area[] = V2_READY_AREAS): boolean {
    if (!flags.admin_v2 || !ready.includes(area)) return false;
    if (area === "products") return flags.admin_v2_products;
    if (area === "orders") return flags.admin_v2_orders;
    if (area === "till") return flags.admin_v2_till;
    return true;
}

type Rule = {
    area: V2Area;
    /** Old path pattern. `:id` matches one segment. */
    legacy: string;
    /** New path pattern, using the same `:id`. */
    v2: string;
    /** Query added on the way forward (and stripped on the way back). */
    query?: Record<string, string>;
    /** Forward only: the new page has no single old equivalent to go back to. */
    oneWay?: boolean;
    /** Also used on the way back, but only when the request carries this rule's
     *  query (":id" values are read from it). For pages the new admin folds into
     *  one URL, such as Analytics reports. */
    backByQuery?: boolean;
};

// Order matters: the first matching rule wins, so specific paths come first.
const RULES: Rule[] = [
    { area: "home", legacy: "/overview", v2: "/home" },
    { area: "home", legacy: "/admin", v2: "/home", oneWay: true },

    { area: "inbox", legacy: "/customers/whatsapp/teach", v2: "/inbox/teach" },
    { area: "inbox", legacy: "/customers/whatsapp", v2: "/inbox" },
    { area: "inbox", legacy: "/customers/forms", v2: "/inbox", query: { f: "form" }, oneWay: true },
    { area: "inbox", legacy: "/customers/requests", v2: "/inbox", query: { f: "request" }, oneWay: true },
    { area: "inbox", legacy: "/ai/inbox", v2: "/inbox", query: { f: "ai" }, oneWay: true },

    { area: "orders", legacy: "/sales/orders/:id", v2: "/orders/:id" },
    { area: "orders", legacy: "/admin/orders/:id", v2: "/orders/:id", oneWay: true },
    { area: "orders", legacy: "/sales/orders", v2: "/orders" },
    { area: "orders", legacy: "/sales/pre-orders", v2: "/orders", query: { preorder: "1" }, oneWay: true },
    { area: "orders", legacy: "/customers/abandoned", v2: "/orders/abandoned" },
    { area: "orders", legacy: "/finance/invoices/:id", v2: "/orders/invoices/:id" },
    { area: "orders", legacy: "/finance/invoices", v2: "/orders/invoices" },
    { area: "orders", legacy: "/finance/links", v2: "/orders/invoices", query: { type: "link" }, oneWay: true },
    { area: "orders", legacy: "/finance", v2: "/orders/invoices", oneWay: true },

    { area: "till", legacy: "/pos/history", v2: "/till/today" },
    { area: "till", legacy: "/pos", v2: "/till" },

    { area: "products", legacy: "/catalog/products/new", v2: "/catalogue/new" },
    { area: "products", legacy: "/admin/products/new", v2: "/catalogue/new", oneWay: true },
    { area: "products", legacy: "/catalog/products/low-stock", v2: "/catalogue/inventory" },
    { area: "products", legacy: "/catalog/products/:id/edit", v2: "/catalogue/:id" },
    { area: "products", legacy: "/catalog/products", v2: "/catalogue" },
    { area: "products", legacy: "/catalog/categories", v2: "/catalogue/categories" },
    { area: "products", legacy: "/admin/categories", v2: "/catalogue/categories", oneWay: true },
    { area: "products", legacy: "/catalog/gift-cards", v2: "/catalogue/gift-cards" },

    { area: "customers", legacy: "/sales/wholesalers", v2: "/customers", query: { segment: "wholesale" }, oneWay: true },
    { area: "customers", legacy: "/admin/customers", v2: "/customers", oneWay: true },

    { area: "discounts", legacy: "/catalog/discounts", v2: "/discounts" },
    { area: "discounts", legacy: "/catalog/auto-discounts", v2: "/discounts", query: { type: "auto" }, oneWay: true },

    { area: "content", legacy: "/cms", v2: "/content" },
    { area: "content", legacy: "/settings/assets", v2: "/content/text", oneWay: true },

    { area: "analytics", legacy: "/sales/analytics", v2: "/analytics" },
    { area: "analytics", legacy: "/admin/analytics", v2: "/analytics", oneWay: true },
    // Payments and Riders are reports on the Analytics page now: the panel
    // opens from ?report= (and ?rider= for one rider's orders). Going back
    // while the area is off, /analytics/reports/<key> returns to the old page.
    { area: "analytics", legacy: "/sales/payments", v2: "/analytics", query: { report: "payments" }, oneWay: true, backByQuery: true },
    { area: "analytics", legacy: "/sales/riders/:id", v2: "/analytics", query: { report: "riders", rider: ":id" }, oneWay: true, backByQuery: true },
    { area: "analytics", legacy: "/sales/riders", v2: "/analytics", query: { report: "riders" }, oneWay: true, backByQuery: true },
    { area: "analytics", legacy: "/sales/payments", v2: "/analytics/reports/payments" },
    { area: "analytics", legacy: "/sales/riders", v2: "/analytics/reports/riders" },

    { area: "staff", legacy: "/team", v2: "/staff" },

    { area: "settings", legacy: "/settings/ai", v2: "/settings/assistants" },
    { area: "settings", legacy: "/seo", v2: "/settings/seo", oneWay: true },
    { area: "settings", legacy: "/communications/emails", v2: "/settings/notifications", oneWay: true },
    { area: "settings", legacy: "/settings/emails", v2: "/settings/notifications", oneWay: true },
    { area: "settings", legacy: "/admin/settings", v2: "/settings", oneWay: true },
];

/** New-only pages and where each goes while its area is off. */
const V2_FALLBACKS: { area: V2Area; v2: string; legacy: string }[] = [
    { area: "home", v2: "/home", legacy: "/overview" },
    { area: "inbox", v2: "/inbox", legacy: "/customers/whatsapp" },
    { area: "orders", v2: "/orders", legacy: "/sales/orders" },
    { area: "till", v2: "/till", legacy: "/pos" },
    { area: "products", v2: "/catalogue", legacy: "/catalog/products" },
    { area: "discounts", v2: "/discounts", legacy: "/catalog/discounts" },
    { area: "content", v2: "/content", legacy: "/cms" },
    { area: "analytics", v2: "/analytics", legacy: "/sales/analytics" },
    { area: "staff", v2: "/staff", legacy: "/team" },
    { area: "billing", v2: "/billing", legacy: "/settings" },
];

/** Every top-level prefix the new admin adds. proxy.ts and sw.js must cover these. */
export const V2_PREFIXES = [
    "/home", "/inbox", "/orders", "/till", "/catalogue", "/discounts", "/content",
    "/analytics", "/staff", "/billing", "/ui-kit",
] as const;

function match(pattern: string, path: string): Record<string, string> | null {
    const p = pattern.split("/").filter(Boolean);
    const s = path.split("/").filter(Boolean);
    if (p.length !== s.length) return null;
    const params: Record<string, string> = {};
    for (let i = 0; i < p.length; i++) {
        if (p[i].startsWith(":")) params[p[i].slice(1)] = s[i];
        else if (p[i] !== s[i]) return null;
    }
    return params;
}

function fill(pattern: string, params: Record<string, string>): string {
    return pattern.replace(/:([a-z]+)/g, (_, k: string) => params[k] ?? "");
}

function withQuery(path: string, search: string, add?: Record<string, string>, params: Record<string, string> = {}): string {
    const q = new URLSearchParams(search);
    for (const [k, v] of Object.entries(add ?? {})) q.set(k, fill(v, params));
    const s = q.toString();
    return s ? `${path}?${s}` : path;
}

function trim(pathname: string): string {
    return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

/**
 * Where a request should go instead, or null to serve it as asked.
 * `search` is the raw query string, with or without the leading "?".
 */
export function v2Redirect(
    pathname: string,
    search: string,
    flags: V2Flags,
    ready: readonly V2Area[] = V2_READY_AREAS,
): string | null {
    const path = trim(pathname);

    // Old URL while its area is on → new URL.
    for (const r of RULES) {
        const params = match(r.legacy, path);
        if (params && areaOn(r.area, flags, ready)) return withQuery(fill(r.v2, params), search, r.query, params);
    }

    // New URL with a report-style query while its area is off → that old page.
    // Rules naming more of the query go first (one rider before all riders).
    const byQuery = RULES.filter(r => r.backByQuery && r.query).sort((a, b) => Object.keys(b.query!).length - Object.keys(a.query!).length);
    for (const r of byQuery) {
        if (!match(r.v2, path) || areaOn(r.area, flags, ready)) continue;
        const q = new URLSearchParams(search);
        const params: Record<string, string> = {};
        const hit = Object.entries(r.query!).every(([k, v]) => {
            const got = q.get(k);
            if (got == null) return false;
            if (v.startsWith(":")) { params[v.slice(1)] = got; return /^[A-Za-z0-9_-]{1,80}$/.test(got); }
            return got === v;
        });
        if (!hit) continue;
        for (const k of Object.keys(r.query!)) q.delete(k);
        const rest = q.toString();
        const legacy = fill(r.legacy, params);
        return rest ? `${legacy}?${rest}` : legacy;
    }

    // New URL while its area is off → old URL. Fixed paths before patterns, so
    // /orders/abandoned isn't read as the order with id "abandoned".
    const back = RULES.filter(r => !r.oneWay).sort((a, b) => Number(a.v2.includes(":")) - Number(b.v2.includes(":")));
    for (const r of back) {
        const params = match(r.v2, path);
        if (params && !areaOn(r.area, flags, ready)) {
            const q = new URLSearchParams(search);
            for (const k of Object.keys(r.query ?? {})) q.delete(k);
            const s = q.toString();
            const legacy = fill(r.legacy, params);
            if (legacy !== path) return s ? `${legacy}?${s}` : legacy;
        }
    }
    for (const f of V2_FALLBACKS) {
        if ((path === f.v2 || path.startsWith(f.v2 + "/")) && !areaOn(f.area, flags, ready)) return f.legacy;
    }
    return null;
}
