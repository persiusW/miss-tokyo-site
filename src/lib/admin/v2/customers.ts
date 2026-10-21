// Admin v2 Customers: the list's URL state, the customer key, tags, the CSV
// import and export, the delete rule and the activity feed. Pure, so the
// page, the server actions and the tests agree.
//
// A customer is keyed by lower(email) (the "contact key"): it is what the old
// profile URL used (/customers/<email>), what customer_list groups by and what
// contact_tags / contact_notes store.

export const PAGE_SIZE = 50;

export type Segment = "all" | "buyers" | "vip" | "wholesale" | "email" | "never";
export const SEGMENTS: readonly { v: Segment; l: string }[] = [
    { v: "all", l: "All" },
    { v: "buyers", l: "Have ordered" },
    { v: "vip", l: "VIP" },
    { v: "wholesale", l: "Wholesale" },
    { v: "email", l: "Get marketing email" },
    { v: "never", l: "Never ordered" },
];

/** Where a customer first came from (customer_list.came_from). */
export type Source = "order" | "account" | "newsletter" | "contact_form" | "custom_request" | "manual" | "imported";
export const SOURCE_LABEL: Record<Source, string> = {
    order: "Order",
    account: "Signed up",
    newsletter: "Newsletter",
    contact_form: "Contact form",
    custom_request: "Custom request",
    manual: "Added by staff",
    imported: "Imported",
};
const CAME_FROM_PHRASE: Record<Source, string> = {
    order: "an order",
    account: "signing up",
    newsletter: "the newsletter",
    contact_form: "the contact form",
    custom_request: "a custom request",
    manual: "being added by staff",
    imported: "an import",
};
export const SOURCES = Object.keys(SOURCE_LABEL) as Source[];
const isSource = (v: unknown): v is Source => typeof v === "string" && (SOURCES as string[]).includes(v);

export type Sort = "recent" | "spent" | "last";
export const SORTS: readonly { v: Sort; l: string }[] = [
    { v: "recent", l: "Most recent first" },
    { v: "spent", l: "Spent, highest first" },
    { v: "last", l: "Last order, newest first" },
];

export type ListQuery = {
    segment: Segment;
    source: Source | "all";
    /** yyyy-mm-dd, first seen on or after (Accra = UTC). */
    from: string;
    to: string;
    q: string;
    tag: string;
    sort: Sort;
    page: number;
};

export const DEFAULT_QUERY: ListQuery = { segment: "all", source: "all", from: "", to: "", q: "", tag: "", sort: "recent", page: 1 };

type Params = URLSearchParams | Record<string, string | string[] | undefined>;
function get(sp: Params, k: string): string {
    if (sp instanceof URLSearchParams) return sp.get(k) ?? "";
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v) ?? "";
}
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseListQuery(sp: Params): ListQuery {
    const segment = get(sp, "segment");
    const source = get(sp, "source");
    const sort = get(sp, "sort");
    const page = Number.parseInt(get(sp, "page"), 10);
    const from = get(sp, "from");
    const to = get(sp, "to");
    return {
        segment: SEGMENTS.some(s => s.v === segment) ? (segment as Segment) : "all",
        source: isSource(source) ? source : "all",
        from: DATE.test(from) ? from : "",
        to: DATE.test(to) ? to : "",
        q: get(sp, "q").slice(0, 80),
        tag: normaliseTag(get(sp, "tag")) ?? "",
        sort: SORTS.some(s => s.v === sort) ? (sort as Sort) : "recent",
        page: Number.isFinite(page) && page > 1 ? Math.min(page, 10_000) : 1,
    };
}

/**
 * The list's query string ("" or "?segment=vip&page=2"), defaults left out.
 * Changing anything but the page goes back to page 1.
 */
export function listSearch(q: ListQuery, patch: Partial<ListQuery> = {}): string {
    const next = { ...q, ...patch };
    if (!("page" in patch)) next.page = 1;
    const p = new URLSearchParams();
    if (next.segment !== "all") p.set("segment", next.segment);
    if (next.source !== "all") p.set("source", next.source);
    if (next.from) p.set("from", next.from);
    if (next.to) p.set("to", next.to);
    if (next.q.trim()) p.set("q", next.q.trim());
    if (next.tag) p.set("tag", next.tag);
    if (next.sort !== "recent") p.set("sort", next.sort);
    if (next.page > 1) p.set("page", String(next.page));
    const s = p.toString();
    return s ? `?${s}` : "";
}

export const filtersActive = (q: ListQuery) => Boolean(q.q.trim() || q.source !== "all" || q.from || q.to || q.tag);

/** PostgREST's or() is comma-separated and uses () and * as syntax; those are dropped from a search. */
export function sanitiseSearch(raw: string): string {
    return raw.trim().replace(/[%,()*\\"]/g, "").slice(0, 80);
}

/** An exact, case-insensitive ilike pattern: LIKE's own wildcards in an email are matched as text. */
export function ilikeExact(text: string): string {
    return text.replace(/[\\%_]/g, m => `\\${m}`);
}

/** lower(email), or null when it isn't an email. */
export function contactKey(raw: unknown): string | null {
    const s = String(raw ?? "").trim().toLowerCase();
    if (s.length < 3 || s.length > 254 || !/^[^\s@/]+@[^\s@/]+$/.test(s)) return null;
    return s;
}

export function customerHref(key: string, search = ""): string {
    return `/customers/${encodeURIComponent(key)}${search}`;
}

/** The customer a /customers/<email> path opens, or null for the list (and for /customers/whatsapp and friends). */
export function keyFromPath(pathname: string): string | null {
    const m = /^\/customers\/([^/]+)\/?$/.exec(pathname);
    if (!m) return null;
    let seg: string;
    try { seg = decodeURIComponent(m[1]); } catch { return null; }
    return contactKey(seg);
}

// ── Tags ───────────────────────────────────────────────────────────────────

export const TAG_MAX = 30;
export const TAGS_PER_CUSTOMER = 20;

/** "  vip  client " → "vip client". Null when nothing is left. Commas split tags, so none survive. */
export function normaliseTag(raw: unknown): string | null {
    const t = String(raw ?? "").replace(/[,\n\r\t]/g, " ").replace(/\s+/g, " ").trim().slice(0, TAG_MAX).trim();
    return t || null;
}

/**
 * The tags to save: normalised, one per spelling regardless of case, and in
 * the casing the shop already uses for that tag ("vip" becomes "VIP" when
 * another customer is tagged "VIP").
 */
export function cleanTags(next: readonly string[], known: readonly string[] = []): string[] {
    const byKey = new Map(known.map(k => [k.toLowerCase(), k] as const));
    const out: string[] = [];
    const seen = new Set<string>();
    for (const raw of next) {
        const t = normaliseTag(raw);
        if (!t) continue;
        const k = t.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(byKey.get(k) ?? t);
        if (out.length >= TAGS_PER_CUSTOMER) break;
    }
    return out;
}

/** What changes between the saved tags and the new ones, compared without case. */
export function tagDiff(saved: readonly string[], next: readonly string[]): { add: string[]; remove: string[] } {
    const s = new Set(saved.map(t => t.toLowerCase()));
    const n = new Set(next.map(t => t.toLowerCase()));
    return { add: next.filter(t => !s.has(t.toLowerCase())), remove: saved.filter(t => !n.has(t.toLowerCase())) };
}

// ── Rows ───────────────────────────────────────────────────────────────────

/** One customer_list row. */
export type CustomerRow = {
    contact_key: string;
    email: string;
    name: string;
    phone: string;
    location: string | null;
    came_from: string;
    first_seen: string;
    last_seen: string;
    has_manual: boolean;
    any_orders: boolean;
    has_other_sources: boolean;
    marketing: boolean;
    orders: number;
    spent: number;
    avg_order: number | null;
    last_order_at: string | null;
    profile_id: string | null;
    account_role: string | null;
    wholesale: boolean;
    tags: string[];
};

export const LIST_COLUMNS = "contact_key, email, name, phone, location, came_from, first_seen, last_seen, has_manual, any_orders, has_other_sources, marketing, orders, spent, avg_order, last_order_at, profile_id, account_role, wholesale, tags";

export const sourceLabel = (s: string) => (isSource(s) ? SOURCE_LABEL[s] : "Other");
export const cameFromPhrase = (s: string) => (isSource(s) ? CAME_FROM_PHRASE[s] : "somewhere else");
export const displayName = (r: { name?: string | null; email: string }) => (r.name || "").trim() || r.email.split("@")[0];

/** "Customer since March 2026". */
export function sinceText(iso: string | null | undefined): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return `Customer since ${d.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "Africa/Accra" })}`;
}

/** Only a contact the team added (by hand or import) and who has never placed an order can be deleted, as in the old list. */
export function canDelete(r: Pick<CustomerRow, "has_manual" | "any_orders">): boolean {
    return r.has_manual && !r.any_orders;
}

const STAFF_ROLES = ["owner", "admin", "sales_staff"];

/**
 * Who wholesale access can be given to or taken from. It lives on the shop
 * account (profiles.role), so someone without an account can't have it, and a
 * team member's role is never touched from here.
 */
export function wholesaleState(r: Pick<CustomerRow, "profile_id" | "account_role" | "wholesale">): "on" | "off" | "no_account" | "staff" {
    if (!r.profile_id) return "no_account";
    if (r.account_role && STAFF_ROLES.includes(r.account_role)) return "staff";
    return r.wholesale ? "on" : "off";
}

// ── Export ─────────────────────────────────────────────────────────────────

/** A spreadsheet runs a cell that starts with = + - @ as a formula; such cells are prefixed with '. */
function cell(v: unknown): string {
    let s = v == null ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
}

const day = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("en-GB", { timeZone: "Africa/Accra" }) : "");

/** The old export's columns (Name, Email, Phone, Primary Source, Added On) and the new list's. */
export function exportCsv(rows: readonly CustomerRow[]): string {
    const head = ["Name", "Email", "Phone", "Primary Source", "Added On", "Location", "Paid orders", "Spent (GHS)", "Last order", "Wholesale", "Tags", "Marketing email"];
    const body = rows.map(r => [
        r.name, r.email, r.phone, sourceLabel(r.came_from), day(r.first_seen), r.location ?? "",
        r.orders, Number(r.spent || 0).toFixed(2), day(r.last_order_at), r.wholesale ? "Yes" : "No", r.tags.join("; "), r.marketing ? "Yes" : "No",
    ]);
    return [head, ...body].map(line => line.map(cell).join(",")).join("\n");
}

// ── Import (the old /admin/customers CSV parser, mapped onto contacts) ──────

export type ImportRow = { email: string; name: string; phone: string | null; address: string | null; marketing: boolean };
export const IMPORT_MAX = 5000;

/**
 * One parsed CSV row (Papa.parse with header: true) → a contact, or null when
 * it has no email. The header names are the old importer's, matched without
 * case: Email / e-mail; First Name, Last Name (or Name / Full Name); Phone /
 * phone_number / Mobile; Address 1 / Region / State, Address 2 / Street,
 * Country; Email Subscription / email_subscribed / Subscribed. Blank cells are
 * null, never "".
 */
export function mapImportRow(row: Record<string, unknown>): ImportRow | null {
    const keys = Object.keys(row);
    const find = (names: string[]): string | null => {
        const k = keys.find(x => names.some(n => x.toLowerCase().trim() === n.toLowerCase()));
        const v = k ? row[k] : null;
        if (v === null || v === undefined) return null;
        const s = String(v).trim();
        return s ? s : null;
    };
    const yes = (names: string[]) => {
        const v = find(names);
        return !!v && ["true", "subscribed", "yes", "1", "y"].includes(v.toLowerCase());
    };
    const email = contactKey(find(["Email", "email", "e-mail"]));
    if (!email) return null;
    const full = find(["Name", "Full Name", "full_name"]);
    const name = (full ?? [find(["First Name", "first_name"]), find(["Last Name", "last_name"])].filter(Boolean).join(" ")).slice(0, 120);
    const address = [find(["Address 2", "Street"]), find(["Address 1", "Region", "State"]), find(["Country", "country_code"])].filter(Boolean).join(", ");
    return {
        email,
        name,
        phone: find(["Phone", "phone_number", "Mobile"])?.slice(0, 40) ?? null,
        address: address ? address.slice(0, 300) : null,
        marketing: yes(["Email Subscription", "email_subscribed", "Subscribed"]),
    };
}

/** Every usable row once, by email (the first row for an email wins). */
export function mapImport(rows: readonly Record<string, unknown>[]): { rows: ImportRow[]; skipped: number } {
    const out: ImportRow[] = [];
    const seen = new Set<string>();
    let skipped = 0;
    for (const r of rows) {
        const m = mapImportRow(r);
        if (!m || seen.has(m.email)) { skipped++; continue; }
        seen.add(m.email);
        out.push(m);
    }
    return { rows: out, skipped };
}

// ── Paid orders ────────────────────────────────────────────────────────────

/** The legacy paid statuses of fn_sales_summary, metrics.ts and the customer_spend view. */
export const PAID_LEGACY_STATUSES = ["paid", "processing", "fulfilled", "delivered", "packed", "ready_for_pickup", "shipped"] as const;

/** The same paid rule as customer_spend, for one order already loaded. */
export function isPaidOrder(o: { payment_status?: string | null; status?: string | null }): boolean {
    if (o.payment_status === "paid") return true;
    return o.payment_status == null && (PAID_LEGACY_STATUSES as readonly string[]).includes(o.status ?? "");
}

// ── Activity ───────────────────────────────────────────────────────────────

export type ActivityItem = { at: string; text: string; tone: "" | "ok" | "warn"; href?: string };

export type ActivityInput = {
    orders: { id: string; ref?: string | null; total_amount: number | null; created_at: string; paid: boolean; cancelled: boolean }[];
    forms: { id: string; message: string | null; at: string; inbox: boolean }[];
    requests: { id: string; details: string | null; created_at: string }[];
    invoices: { id: string; type: string | null; amount: number | null; status: string | null; created_at: string }[];
    chats: { id: string; created_at: string; last_message_at: string | null }[];
    accountAt: string | null;
    newsletterAt: string | null;
    addedAt: string | null;
};

const clip = (s: string | null | undefined, n = 80) => {
    const t = (s || "").replace(/\s+/g, " ").trim();
    return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};
const gh = (n: number | null | undefined) => `GH₵ ${Number(n || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const orderRefOf = (o: { id: string; ref?: string | null }) => `#${(o.ref || o.id.slice(0, 8)).toUpperCase()}`;

/** Everything the customer did, newest first, in plain words. */
export function buildActivity(a: ActivityInput): ActivityItem[] {
    const items: ActivityItem[] = [];
    for (const o of a.orders) {
        const state = o.paid ? "" : o.cancelled ? " · not paid" : " · waiting for payment";
        items.push({ at: o.created_at, text: `Placed order ${orderRefOf(o)} · ${gh(o.total_amount)}${state}`, tone: o.paid ? "ok" : o.cancelled ? "" : "warn", href: `/orders/${o.id}` });
    }
    for (const f of a.forms) {
        items.push({ at: f.at, text: `Contact form: “${clip(f.message) || "No message"}”`, tone: "", href: f.inbox ? `/inbox?c=form:${f.id}` : undefined });
    }
    for (const r of a.requests) {
        items.push({ at: r.created_at, text: `Custom request: “${clip(r.details) || "No details"}”`, tone: "", href: `/inbox?c=request:${r.id}` });
    }
    for (const d of a.invoices) {
        const kind = (d.type || "invoice").toLowerCase() === "quote" ? "Quote" : "Invoice";
        items.push({ at: d.created_at, text: `${kind} for ${gh(d.amount)}${d.status ? ` · ${d.status.replace(/_/g, " ")}` : ""}`, tone: "", href: `/orders/invoices/${d.id}` });
    }
    for (const c of a.chats) {
        items.push({ at: c.created_at, text: "First messaged the shop on WhatsApp", tone: "", href: `/inbox?c=${c.id}` });
        if (c.last_message_at && c.last_message_at !== c.created_at) items.push({ at: c.last_message_at, text: "Latest WhatsApp message", tone: "", href: `/inbox?c=${c.id}` });
    }
    if (a.accountAt) items.push({ at: a.accountAt, text: "Signed up for an account on the shop", tone: "" });
    if (a.newsletterAt) items.push({ at: a.newsletterAt, text: "Signed up for the newsletter", tone: "" });
    if (a.addedAt) items.push({ at: a.addedAt, text: "Added to the customer list by the team", tone: "" });
    return items.filter(i => !Number.isNaN(Date.parse(i.at))).sort((x, y) => Date.parse(y.at) - Date.parse(x.at));
}
