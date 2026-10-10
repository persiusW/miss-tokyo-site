// Where an error happened, as the admin errors card shows it: one of the
// app's own page routes with its ids as placeholders, or "other". The path
// comes from the Referer header or the browser, so anything that isn't a
// known page is never stored as written.

/** Every page route in src/app (route groups removed). A unit test keeps this in sync. */
export const PAGE_ROUTES: readonly string[] = [
    "/",
    "/about",
    "/account",
    "/account/addresses",
    "/account/orders",
    "/account/orders/[id]",
    "/account/overview",
    "/account/profile",
    "/account/saved",
    "/account/settings",
    "/admin",
    "/admin/analytics",
    "/admin/categories",
    "/admin/customers",
    "/admin/login",
    "/admin/orders/[id]",
    "/admin/products/new",
    "/admin/settings",
    "/agent",
    "/ai/inbox",
    "/auth/confirm",
    "/catalog/auto-discounts",
    "/catalog/categories",
    "/catalog/discounts",
    "/catalog/gift-cards",
    "/catalog/products",
    "/catalog/products/[id]/edit",
    "/catalog/products/low-stock",
    "/catalog/products/new",
    "/checkout",
    "/checkout/cancel",
    "/checkout/direct",
    "/checkout/success",
    "/claim-account",
    "/cms",
    "/communications/emails",
    "/contact",
    "/craft",
    "/customers",
    "/customers/[id]",
    "/customers/abandoned",
    "/customers/forms",
    "/customers/requests",
    "/dresses",
    "/faq",
    "/finance",
    "/finance/invoices",
    "/finance/invoices/[id]",
    "/finance/links",
    "/gallery",
    "/gift-card",
    "/gift-cards",
    "/gift-cards/success",
    "/invite",
    "/invoice/[id]",
    "/login",
    "/new-arrivals",
    "/overview",
    "/pay/[pos_id]",
    "/policies/accessibility-statement",
    "/policies/privacy-policy",
    "/policies/refund-policy",
    "/policies/shipping-policy",
    "/policies/terms-and-conditions",
    "/pos",
    "/pos/history",
    "/privacy",
    "/products/[slug]",
    "/register",
    "/reset-password",
    "/sale",
    "/sales/analytics",
    "/sales/orders",
    "/sales/orders/[id]",
    "/sales/payments",
    "/sales/pre-orders",
    "/sales/riders",
    "/sales/riders/[id]",
    "/sales/wholesalers",
    "/search",
    "/seo",
    "/settings",
    "/settings/ai",
    "/settings/assets",
    "/settings/emails",
    "/shipping",
    "/shop",
    "/size-guide",
    "/team",
    "/terms",
    "/test-orders",
    "/track",
    "/whitelabel",
];

const STAFF_PREFIXES = ["/overview", "/pos", "/sales", "/catalog", "/customers", "/finance", "/seo", "/settings", "/cms", "/communications", "/team", "/agent", "/ai", "/test-orders"];
const ID_SEGMENT = /^[A-Za-z0-9_-]{1,80}$/;
const SPLIT = PAGE_ROUTES.map(r => r.split("/").filter(Boolean));

function matchRoute(segs: string[]): string | null {
    let dynamicHit: string | null = null;
    for (const route of SPLIT) {
        if (route.length !== segs.length) continue;
        let dynamic = false;
        const ok = route.every((part, i) => {
            if (part.startsWith("[")) { dynamic = true; return ID_SEGMENT.test(segs[i]); }
            return part === segs[i];
        });
        if (!ok) continue;
        const shown = "/" + route.map(p => (p.startsWith("[") ? ":" + p.slice(1, -1) : p)).join("/");
        if (!dynamic) return shown;
        dynamicHit ??= shown;
    }
    return dynamicHit;
}

export function cleanPlace(pathOrUrl: string | null | undefined): string | null {
    const raw = String(pathOrUrl ?? "").trim();
    if (!raw) return null;
    let path: string;
    try {
        path = raw.startsWith("/") ? new URL(raw, "http://x").pathname : new URL(raw).pathname;
    } catch {
        return null;
    }
    return matchRoute(path.split("/").filter(Boolean)) ?? "other";
}

export function audienceForPath(path: string): "staff" | "customer" {
    return STAFF_PREFIXES.some(p => path === p || path.startsWith(p + "/")) ? "staff" : "customer";
}

/**
 * Per-instance write limit for error events: the same code/page/audience is
 * kept once a window, and at most `max` events are kept a window in total.
 */
export class ErrorEventGate {
    private seen = new Map<string, number>();
    private windowStart = 0;
    private count = 0;
    constructor(private max: number, private windowMs: number) {}

    allow(key: string, now: number): boolean {
        if (now - this.windowStart >= this.windowMs) {
            this.windowStart = now;
            this.count = 0;
            for (const [k, t] of this.seen) if (now - t >= this.windowMs) this.seen.delete(k);
        }
        const last = this.seen.get(key);
        if (last !== undefined && now - last < this.windowMs) return false;
        if (this.count >= this.max) return false;
        this.count += 1;
        this.seen.set(key, now);
        return true;
    }
}
