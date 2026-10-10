// Where an error happened, as the admin errors card shows it: the page path
// only, with ids masked. No query strings, no customer details.

const STAFF_PREFIXES = ["/overview", "/pos", "/sales", "/catalog", "/customers", "/finance", "/seo", "/settings", "/cms", "/communications", "/team", "/agent", "/ai", "/test-orders"];

export function cleanPlace(pathOrUrl: string | null | undefined): string | null {
    const raw = String(pathOrUrl ?? "").trim();
    if (!raw) return null;
    let path: string;
    try {
        path = raw.startsWith("/") ? new URL(raw, "http://x").pathname : new URL(raw).pathname;
    } catch {
        return null;
    }
    const masked = path.split("/").map(seg => (/\d{4,}|^[0-9a-f-]{20,}$/i.test(seg) ? ":id" : seg)).join("/");
    return masked.slice(0, 120);
}

export function audienceForPath(path: string): "staff" | "customer" {
    return STAFF_PREFIXES.some(p => path === p || path.startsWith(p + "/")) ? "staff" : "customer";
}
