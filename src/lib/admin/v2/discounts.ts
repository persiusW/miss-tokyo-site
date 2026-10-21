// Discounts (admin v2): codes and automatic discounts as one list, their
// status, the overlap warning, the panel's summary sentence and the form ↔
// row mapping. Pure: no database, safe for client and server.
//
// Nothing here decides what a discount is worth. That is computeDiscountSplit
// (codes) and evaluateAutoDiscounts (automatic), both unchanged; this module
// only reads the rows to decide what to show and what to save.

export type Kind = "code" | "auto";
export type Status = "active" | "scheduled" | "ended" | "off";
export type StatusChip = "all" | "active" | "scheduled" | "ended";
export type TypeFilter = "all" | "code" | "auto";

export type CodeType = "percentage" | "fixed" | "free_shipping" | "sale_price" | "buy_x_get_y";
export type AutoType = "PERCENTAGE" | "FIXED";
export type AppliesTo = "ALL_PRODUCTS" | "SPECIFIC_CATEGORIES" | "SPECIFIC_PRODUCTS";
export type QtyScope = "ACROSS_TARGET" | "PER_PRODUCT";

export type CouponRow = {
    id: string;
    code: string;
    discount_type: CodeType | string;
    discount_value: number | string | null;
    min_order_value: number | string | null;
    usage_limit: number | null;
    used_count: number | null;
    is_active: boolean | null;
    starts_at: string | null;
    expires_at: string | null;
    buy_quantity: number | null;
    get_quantity: number | null;
    free_shipping: boolean | null;
    category_id: string | null;
    single_use_per_customer: boolean | null;
    created_at: string | null;
};

export type AutoRow = {
    id: string;
    title: string;
    is_active: boolean | null;
    discount_type: AutoType | string;
    discount_value: number | string;
    applies_to: AppliesTo | string;
    target_category_ids: string[] | null;
    target_product_ids: string[] | null;
    min_quantity: number | null;
    quantity_scope: QtyScope | string;
    min_order_amount: number | string | null;
    starts_at: string | null;
    ends_at: string | null;
    created_at: string | null;
};

/** One discount's figures from fn_discount_results (paid orders only). */
export type Results = { orders: number; sales: number; given: number; shared: number; all: number };

export type Target = { all: true } | { categories: string[] } | { products: string[] } | { delivery: true };

export type Names = { categories: Record<string, string>; products: Record<string, string> };

export type Discount = {
    id: string;
    kind: Kind;
    /** The code, or the automatic discount's title. */
    name: string;
    value: string;
    status: Status;
    statusLabel: string;
    applies: string;
    target: Target;
    start: string | null;
    end: string | null;
    used: number;
    limit: number | null;
    results: Results | null;
    created: string | null;
};

const num = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};
const t = (iso: string | null | undefined): number | null => {
    if (!iso) return null;
    const n = new Date(iso).getTime();
    return Number.isFinite(n) ? n : null;
};

const money = (v: unknown): string => {
    const n = num(v);
    return `GH₵ ${n.toLocaleString("en-GB", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
};

// ── Status ───────────────────────────────────────────────────────────────────

export const STATUS_LABEL: Record<Status, string> = { active: "Active", scheduled: "Scheduled", ended: "Ended", off: "Off" };
export const STATUS_TONE: Record<Status, "ok" | "info" | "neutral"> = { active: "ok", scheduled: "info", ended: "neutral", off: "neutral" };

/** A code is off by its switch, scheduled before its start, ended after its end date or once its uses run out. */
export function couponStatus(c: Pick<CouponRow, "is_active" | "starts_at" | "expires_at" | "usage_limit" | "used_count">, now: Date = new Date()): { status: Status; label: string } {
    if (!c.is_active) return { status: "off", label: "Off" };
    const n = now.getTime();
    const s = t(c.starts_at), e = t(c.expires_at);
    if (s != null && s > n) return { status: "scheduled", label: "Scheduled" };
    if (e != null && e < n) return { status: "ended", label: "Ended" };
    if (c.usage_limit != null && num(c.used_count) >= c.usage_limit) return { status: "ended", label: "Used up" };
    return { status: "active", label: "Active" };
}

export function autoStatus(a: Pick<AutoRow, "is_active" | "starts_at" | "ends_at">, now: Date = new Date()): { status: Status; label: string } {
    if (!a.is_active) return { status: "off", label: "Off" };
    const n = now.getTime();
    const s = t(a.starts_at), e = t(a.ends_at);
    if (s != null && s > n) return { status: "scheduled", label: "Scheduled" };
    if (e != null && e < n) return { status: "ended", label: "Ended" };
    return { status: "active", label: "Active" };
}

// ── Words ────────────────────────────────────────────────────────────────────

export const CODE_TYPE_LABEL: Record<CodeType, string> = {
    percentage: "Percentage",
    fixed: "Fixed amount",
    free_shipping: "Free delivery",
    sale_price: "Sale price",
    buy_x_get_y: "Buy X get Y",
};

/** Code types the checkout takes nothing off for by itself (computeDiscountSplit returns zero). */
export const MANUAL_CODE_TYPES: readonly CodeType[] = ["sale_price", "buy_x_get_y"];

export function codeValueText(c: Pick<CouponRow, "discount_type" | "discount_value" | "buy_quantity" | "get_quantity">): string {
    switch (c.discount_type) {
        case "percentage": return `${num(c.discount_value)}% off`;
        case "fixed": return `${money(c.discount_value)} off`;
        case "free_shipping": return "Free delivery";
        case "sale_price": return `Sale price ${money(c.discount_value)}`;
        case "buy_x_get_y": return `Buy ${c.buy_quantity ?? "?"}, get ${c.get_quantity ?? "?"} free`;
        default: return "Discount";
    }
}

export function autoValueText(a: Pick<AutoRow, "discount_type" | "discount_value">): string {
    return a.discount_type === "PERCENTAGE" ? `${num(a.discount_value)}% off` : `${money(a.discount_value)} off`;
}

/** "Dresses", "Dresses and Tops", "Dresses, Tops and 3 more". */
export function listNames(names: string[], max = 2): string {
    const n = names.map(x => x.trim()).filter(Boolean);
    if (n.length === 0) return "";
    if (n.length <= max) return n.length === 2 ? `${n[0]} and ${n[1]}` : n[0];
    if (max === 2 && n.length === 3) return `${n[0]}, ${n[1]} and ${n[2]}`;
    return `${n.slice(0, max).join(", ")} and ${n.length - max} more`;
}

/**
 * What a code really reaches at checkout. coupons.category_id is saved and
 * shown, but neither validate-code nor validateDiscountCode reads it: a code
 * comes off every item no automatic discount covers. So a code's target is
 * everything (or the delivery fee), whatever category it is marked with.
 */
export function couponTarget(c: Pick<CouponRow, "discount_type">): Target {
    return c.discount_type === "free_shipping" ? { delivery: true } : { all: true };
}

/** The list's Applies to for a code, with the category it's marked with. */
export function couponAppliesText(c: Pick<CouponRow, "discount_type" | "category_id">, names: Names): string {
    if (c.discount_type === "free_shipping") return "Delivery";
    return c.category_id ? `Everything (marked ${names.categories[c.category_id] ?? "a category that was removed"})` : "Everything";
}

export function autoTarget(a: Pick<AutoRow, "applies_to" | "target_category_ids" | "target_product_ids">): Target {
    if (a.applies_to === "SPECIFIC_CATEGORIES") return { categories: a.target_category_ids ?? [] };
    if (a.applies_to === "SPECIFIC_PRODUCTS") return { products: a.target_product_ids ?? [] };
    return { all: true };
}

export function targetText(target: Target, names: Names): string {
    if ("delivery" in target) return "Delivery";
    if ("all" in target) return "Everything";
    if ("categories" in target) return listNames(target.categories.map(id => names.categories[id] ?? "a category that was removed")) || "No categories picked";
    return listNames(target.products.map(id => names.products[id] ?? "a product that was removed")) || "No products picked";
}

const TZ = "Africa/Accra";
/** "31 Oct 2026", with the time when it isn't the start or end of the day. */
export function dateText(iso: string | null | undefined): string {
    const ms = t(iso);
    if (ms == null) return "";
    const d = new Date(ms);
    const day = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
    const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
    return time === "00:00" || time === "23:59" ? day : `${day}, ${time}`;
}

/** The list's Dates column. */
export function datesText(start: string | null, end: string | null): string {
    if (start && end) return `${dateText(start)} – ${dateText(end)}`;
    if (end) return `Until ${dateText(end)}`;
    if (start) return `${dateText(start)} onwards`;
    return "No end date";
}

// ── Rows → one list ──────────────────────────────────────────────────────────

export function fromCoupon(c: CouponRow, names: Names, results: Results | null, now: Date = new Date()): Discount {
    const st = couponStatus(c, now);
    const target = couponTarget(c);
    return {
        id: c.id, kind: "code", name: c.code, value: codeValueText(c), status: st.status, statusLabel: st.label,
        applies: couponAppliesText(c, names), target, start: c.starts_at, end: c.expires_at,
        used: num(c.used_count), limit: c.usage_limit ?? null, results, created: c.created_at,
    };
}

export function fromAuto(a: AutoRow, names: Names, results: Results | null, now: Date = new Date()): Discount {
    const st = autoStatus(a, now);
    const target = autoTarget(a);
    return {
        id: a.id, kind: "auto", name: a.title, value: autoValueText(a), status: st.status, statusLabel: st.label,
        applies: targetText(target, names), target, start: a.starts_at, end: a.ends_at,
        // The old Auto Discounts page counted uses as every order carrying the
        // title, paid or not; kept so the number doesn't change under staff.
        used: results?.all ?? 0, limit: null, results, created: a.created_at,
    };
}

// ── List URL state ───────────────────────────────────────────────────────────

export type ListQuery = { status: StatusChip; type: TypeFilter; q: string };
export const DEFAULT_QUERY: ListQuery = { status: "all", type: "all", q: "" };
export const STATUS_CHIPS: { v: StatusChip; l: string }[] = [
    { v: "all", l: "All" }, { v: "active", l: "Active" }, { v: "scheduled", l: "Scheduled" }, { v: "ended", l: "Ended" },
];

type SP = URLSearchParams | Record<string, string | string[] | undefined>;
const get = (sp: SP, k: string): string => {
    if (sp instanceof URLSearchParams) return sp.get(k) ?? "";
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v) ?? "";
};

export function parseListQuery(sp: SP): ListQuery {
    const status = get(sp, "status") as StatusChip;
    const type = get(sp, "type") as TypeFilter;
    return {
        status: STATUS_CHIPS.some(c => c.v === status) ? status : "all",
        type: type === "code" || type === "auto" ? type : "all",
        q: get(sp, "q").trim().slice(0, 80),
    };
}

/** "?status=active&type=auto&q=slides", leaving defaults out. */
export function listSearch(q: ListQuery, patch: Partial<ListQuery> = {}): string {
    const m = { ...q, ...patch };
    const p = new URLSearchParams();
    if (m.status !== "all") p.set("status", m.status);
    if (m.type !== "all") p.set("type", m.type);
    if (m.q.trim()) p.set("q", m.q.trim());
    const s = p.toString();
    return s ? `?${s}` : "";
}

const matchesText = (d: Discount, q: string) => {
    const s = q.trim().toLowerCase();
    return !s || d.name.toLowerCase().includes(s) || d.value.toLowerCase().includes(s) || d.applies.toLowerCase().includes(s);
};

export function filterList(rows: Discount[], q: ListQuery): Discount[] {
    return rows.filter(d => (q.type === "all" || d.kind === q.type) && (q.status === "all" || d.status === q.status) && matchesText(d, q.q));
}

/** Chip counts follow the search and the type, never the chip itself. */
export function chipCounts(rows: Discount[], q: ListQuery): Record<StatusChip, number> {
    const base = rows.filter(d => (q.type === "all" || d.kind === q.type) && matchesText(d, q.q));
    return {
        all: base.length,
        active: base.filter(d => d.status === "active").length,
        scheduled: base.filter(d => d.status === "scheduled").length,
        ended: base.filter(d => d.status === "ended").length,
    };
}

/** Live first, then scheduled, ended and off; newest first within each. */
export function sortList(rows: Discount[]): Discount[] {
    const rank: Record<Status, number> = { active: 0, scheduled: 1, ended: 2, off: 3 };
    return [...rows].sort((a, b) => rank[a.status] - rank[b.status] || (t(b.created) ?? 0) - (t(a.created) ?? 0));
}

// ── Overlaps (BACKEND_GAPS 15) ───────────────────────────────────────────────
//
// What the checkout does when two discounts reach the same item, from
// lib/autoDiscount.ts and createCheckoutOrder:
//   • automatic + automatic: every qualifying rule is scored on the cart, the
//     bigger saving claims its items first, and a smaller one only applies to
//     items no rule has claimed. Never both on one item.
//   • code + automatic: a code only comes off items no automatic discount
//     covers, and can't be used at all when every item is covered.
//   • code + code: a customer can enter only one code, so they never meet.

export type Overlap = { a: Discount; b: Discount; what: string; from: string | null; until: string | null; title: string; body: string };

const LIVE: Status[] = ["active", "scheduled"];

function rangesMeet(a: Discount, b: Discount): boolean {
    const as = t(a.start) ?? -Infinity, ae = t(a.end) ?? Infinity;
    const bs = t(b.start) ?? -Infinity, be = t(b.end) ?? Infinity;
    return as < be && bs < ae;
}

/** Names of what both targets reach, or null when they share nothing. */
export function sharedTarget(a: Target, b: Target, names: Names, productCategories: Record<string, string[]>): string | null {
    if ("delivery" in a || "delivery" in b) return null;
    const cat = (id: string) => names.categories[id] ?? "a category";
    const prod = (id: string) => names.products[id] ?? "a product";
    if ("all" in a && "all" in b) return "every product";
    if ("all" in a) return targetText(b, names);
    if ("all" in b) return targetText(a, names);
    if ("categories" in a && "categories" in b) {
        const s = a.categories.filter(c => b.categories.includes(c));
        return s.length ? listNames(s.map(cat)) : null;
    }
    if ("products" in a && "products" in b) {
        const s = a.products.filter(p => b.products.includes(p));
        return s.length ? listNames(s.map(prod)) : null;
    }
    const cats = "categories" in a ? a.categories : (b as { categories: string[] }).categories;
    const prods = "products" in a ? a.products : (b as { products: string[] }).products;
    const s = prods.filter(p => (productCategories[p] ?? []).some(c => cats.includes(c)));
    return s.length ? listNames(s.map(prod)) : null;
}

const quoted = (d: Discount) => (d.kind === "code" ? d.name : `“${d.name}”`);

export function overlapSentence(a: Discount, b: Discount): string {
    if (a.kind === "auto" && b.kind === "auto") {
        return "When a cart qualifies for both, the one that saves more on that cart takes the items they share and the other applies only to items left over. Customers never get both on one item.";
    }
    const auto = a.kind === "auto" ? a : b;
    return `On items ${quoted(auto)} covers, the checkout takes the automatic discount and the code comes off the rest of the cart only. If every item has the automatic discount, the code can't be used.`;
}

export function findOverlaps(rows: Discount[], names: Names, productCategories: Record<string, string[]>, now: Date = new Date()): Overlap[] {
    const live = rows.filter(d => LIVE.includes(d.status));
    const out: Overlap[] = [];
    for (let i = 0; i < live.length; i++) {
        for (let j = i + 1; j < live.length; j++) {
            let a = live[i], b = live[j];
            if (a.kind === "code" && b.kind === "code") continue;
            if (!rangesMeet(a, b)) continue;
            const what = sharedTarget(a.target, b.target, names, productCategories);
            if (!what) continue;
            if (a.kind === "auto" && b.kind === "code") [a, b] = [b, a];
            const ends = [a.end, b.end].filter(Boolean) as string[];
            const until = ends.length ? ends.reduce((x, y) => (t(x)! < t(y)! ? x : y)) : null;
            const starts = [a.start, b.start].filter(x => x && t(x)! > now.getTime()) as string[];
            const from = starts.length ? starts.reduce((x, y) => (t(x)! > t(y)! ? x : y)) : null;
            const when = from ? ` from ${dateText(from)}` : "";
            const till = until ? ` until ${dateText(until)}` : "";
            out.push({
                a, b, what, from, until,
                title: `Two discounts can apply to ${what}`,
                body: `${quoted(a)} and ${quoted(b)} overlap${when}${till}. ${overlapSentence(a, b)}`,
            });
        }
    }
    return out;
}

// ── The panel's form ─────────────────────────────────────────────────────────

export type Condition = "none" | "min" | "qty";

export type DiscountForm = {
    kind: Kind;
    code: string;
    title: string;
    codeType: CodeType;
    autoType: AutoType;
    value: string;
    buyQty: string;
    getQty: string;
    applies: AppliesTo;
    categoryIds: string[];
    productIds: string[];
    condition: Condition;
    minTotal: string;
    minQty: string;
    qtyScope: QtyScope;
    /** datetime-local strings ("2026-10-21T09:00") in the browser's time. */
    start: string;
    hasEnd: boolean;
    end: string;
    limit: string;
    oncePerCustomer: boolean;
    isActive: boolean;
};

const pad = (n: number) => String(n).padStart(2, "0");
/** ISO → the value a datetime-local input shows, in this device's time. */
export function toLocalInput(iso: string | null | undefined): string {
    const ms = t(iso);
    if (ms == null) return "";
    const d = new Date(ms);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
/** A datetime-local value → ISO, or null when empty or unreadable. */
export function fromLocalInput(v: string): string | null {
    if (!v) return null;
    const d = new Date(v);
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

/** The end of the day a week from now, the default when "Has an end date" is switched on. */
export function defaultEnd(now: Date = new Date()): string {
    const d = new Date(now.getTime() + 7 * 86_400_000);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T23:59`;
}

export function emptyForm(kind: Kind, now: Date = new Date()): DiscountForm {
    return {
        kind, code: "", title: "", codeType: "percentage", autoType: "PERCENTAGE", value: "", buyQty: "2", getQty: "1",
        applies: "ALL_PRODUCTS", categoryIds: [], productIds: [], condition: "none", minTotal: "", minQty: "2", qtyScope: "ACROSS_TARGET",
        start: toLocalInput(now.toISOString()), hasEnd: false, end: "", limit: "", oncePerCustomer: false, isActive: true,
    };
}

const s = (v: unknown) => (v == null ? "" : String(v));

export function formFromCoupon(c: CouponRow): DiscountForm {
    const min = num(c.min_order_value);
    return {
        ...emptyForm("code"),
        code: c.code,
        codeType: (Object.keys(CODE_TYPE_LABEL).includes(c.discount_type) ? c.discount_type : "fixed") as CodeType,
        value: c.discount_type === "free_shipping" || c.discount_type === "buy_x_get_y" ? "" : s(c.discount_value),
        buyQty: s(c.buy_quantity ?? 2), getQty: s(c.get_quantity ?? 1),
        applies: c.category_id ? "SPECIFIC_CATEGORIES" : "ALL_PRODUCTS",
        categoryIds: c.category_id ? [c.category_id] : [],
        condition: min > 0 ? "min" : "none", minTotal: min > 0 ? s(min) : "",
        start: toLocalInput(c.starts_at ?? c.created_at), hasEnd: !!c.expires_at, end: toLocalInput(c.expires_at),
        limit: c.usage_limit != null ? s(c.usage_limit) : "", oncePerCustomer: !!c.single_use_per_customer, isActive: !!c.is_active,
    };
}

export function formFromAuto(a: AutoRow): DiscountForm {
    const minQty = num(a.min_quantity) || 1;
    const minAmt = a.min_order_amount != null ? num(a.min_order_amount) : 0;
    return {
        ...emptyForm("auto"),
        title: a.title,
        autoType: a.discount_type === "FIXED" ? "FIXED" : "PERCENTAGE",
        value: s(a.discount_value),
        applies: (["ALL_PRODUCTS", "SPECIFIC_CATEGORIES", "SPECIFIC_PRODUCTS"].includes(a.applies_to) ? a.applies_to : "ALL_PRODUCTS") as AppliesTo,
        categoryIds: a.target_category_ids ?? [], productIds: a.target_product_ids ?? [],
        // A rule can need both a quantity and a total; "Minimum number of
        // items" then shows the optional total underneath, so nothing is lost.
        condition: minQty > 1 ? "qty" : minAmt > 0 ? "min" : "none",
        minTotal: minAmt > 0 ? s(minAmt) : "", minQty: minQty > 1 ? s(minQty) : "2",
        qtyScope: a.quantity_scope === "PER_PRODUCT" ? "PER_PRODUCT" : "ACROSS_TARGET",
        start: toLocalInput(a.starts_at ?? a.created_at), hasEnd: !!a.ends_at, end: toLocalInput(a.ends_at),
        isActive: !!a.is_active,
    };
}

export const CODE_RE = /^[A-Z0-9][A-Z0-9_-]{2,29}$/;
export const normaliseCode = (v: string) => v.toUpperCase().replace(/\s+/g, "");

/** A code nobody is likely to guess: MT plus six letters and numbers (no 0/O or 1/I). */
export function makeCode(rand: () => number = Math.random): string {
    const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "MT";
    for (let i = 0; i < 6; i++) out += A[Math.floor(rand() * A.length) % A.length];
    return out;
}

const pos = (v: string) => Number(v) > 0 && Number.isFinite(Number(v));
const whole = (v: string) => /^\d+$/.test(v.trim()) && Number(v) >= 1;

export type FormErrors = Partial<Record<"code" | "title" | "value" | "buyQty" | "getQty" | "targets" | "minTotal" | "minQty" | "start" | "end" | "limit", string>>;

/** What's wrong with the form, in words for staff. `codeChanged` skips the format check for an old code kept as it is. */
export function validateForm(f: DiscountForm, codeChanged = true): FormErrors {
    const e: FormErrors = {};
    if (f.kind === "code") {
        if (!f.code.trim()) e.code = "Enter a code, or tap Make one up.";
        else if (codeChanged && !CODE_RE.test(f.code)) e.code = "Use 3 to 30 capital letters, numbers, dashes or underscores, no spaces.";
        if (f.codeType === "percentage" && !(pos(f.value) && Number(f.value) <= 100)) e.value = "Enter a percentage between 1 and 100.";
        if ((f.codeType === "fixed" || f.codeType === "sale_price") && !pos(f.value)) e.value = "Enter the amount in GH₵.";
        if (f.codeType === "buy_x_get_y") {
            if (!whole(f.buyQty)) e.buyQty = "Enter how many they buy.";
            if (!whole(f.getQty)) e.getQty = "Enter how many they get free.";
        }
        if (f.limit.trim() && !whole(f.limit)) e.limit = "Enter a whole number, or leave it empty for no limit.";
    } else {
        if (!f.title.trim()) e.title = "Give it a title. Customers see it in their cart.";
        if (!pos(f.value) || (f.autoType === "PERCENTAGE" && Number(f.value) > 100)) e.value = f.autoType === "PERCENTAGE" ? "Enter a percentage between 1 and 100." : "Enter the amount in GH₵.";
        if (f.condition === "qty" && !(whole(f.minQty) && Number(f.minQty) >= 2)) e.minQty = "Enter 2 or more. For any single item, pick No conditions.";
        if (f.condition === "qty" && f.minTotal.trim() && !pos(f.minTotal)) e.minTotal = "Enter the amount in GH₵, or leave it empty.";
    }
    if (f.applies === "SPECIFIC_CATEGORIES" && f.categoryIds.length === 0) e.targets = "Pick at least one category.";
    if (f.applies === "SPECIFIC_PRODUCTS" && f.productIds.length === 0) e.targets = "Pick at least one product.";
    if (f.condition === "min" && !pos(f.minTotal)) e.minTotal = "Enter the order total in GH₵.";
    if (f.start && !fromLocalInput(f.start)) e.start = "Pick a start date.";
    if (f.hasEnd) {
        const end = fromLocalInput(f.end);
        if (!end) e.end = "Pick an end date, or switch off Has an end date.";
        else if (f.start && fromLocalInput(f.start) && t(end)! <= t(fromLocalInput(f.start))!) e.end = "The end has to be after the start.";
    }
    return e;
}

const orNull = (v: string) => (v.trim() ? Number(v) : null);

/** The coupons row to save. Value for types the checkout doesn't price is 0 (the column is NOT NULL). */
export function couponPayload(f: DiscountForm) {
    const priced = f.codeType === "percentage" || f.codeType === "fixed" || f.codeType === "sale_price";
    return {
        code: normaliseCode(f.code),
        discount_type: f.codeType,
        discount_value: priced ? Number(f.value) : 0,
        free_shipping: f.codeType === "free_shipping",
        buy_quantity: f.codeType === "buy_x_get_y" ? Number(f.buyQty) : null,
        get_quantity: f.codeType === "buy_x_get_y" ? Number(f.getQty) : null,
        category_id: f.codeType !== "free_shipping" && f.applies === "SPECIFIC_CATEGORIES" ? f.categoryIds[0] ?? null : null,
        min_order_value: f.condition === "min" ? Number(f.minTotal) : null,
        usage_limit: orNull(f.limit),
        single_use_per_customer: f.oncePerCustomer,
        starts_at: fromLocalInput(f.start),
        expires_at: f.hasEnd ? fromLocalInput(f.end) : null,
    };
}

/** The automatic_discounts row to save, the same shape the old Auto Discounts page wrote. */
export function autoPayload(f: DiscountForm, now: Date = new Date()) {
    return {
        title: f.title.trim(),
        discount_type: f.autoType,
        discount_value: Number(f.value),
        applies_to: f.applies,
        target_category_ids: f.applies === "SPECIFIC_CATEGORIES" ? f.categoryIds : [],
        target_product_ids: f.applies === "SPECIFIC_PRODUCTS" ? f.productIds : [],
        min_quantity: f.condition === "qty" ? Number(f.minQty) : 1,
        quantity_scope: f.qtyScope,
        min_order_amount: f.condition === "min" || (f.condition === "qty" && f.minTotal.trim()) ? Number(f.minTotal) : null,
        starts_at: fromLocalInput(f.start) ?? now.toISOString(),
        ends_at: f.hasEnd ? fromLocalInput(f.end) : null,
    };
}

// ── The summary sentence ─────────────────────────────────────────────────────

function formTarget(f: DiscountForm, names: Names): string {
    // Codes come off the whole cart whatever category they're marked with (couponTarget)
    if (f.kind === "code") return f.codeType === "free_shipping" ? "" : "everything";
    if (f.applies === "SPECIFIC_CATEGORIES") return listNames(f.categoryIds.map(id => names.categories[id] ?? "a category")) || "the categories you pick";
    if (f.applies === "SPECIFIC_PRODUCTS") return listNames(f.productIds.map(id => names.products[id] ?? "a product")) || "the products you pick";
    return "everything";
}

/** One sentence that says what the discount will do, updated as the form changes. */
export function summarySentence(f: DiscountForm, names: Names, now: Date = new Date()): string {
    const parts: string[] = [];
    const target = formTarget(f, names);
    let lead: string;
    if (f.kind === "code") {
        const v = f.value.trim();
        switch (f.codeType) {
            case "percentage": lead = `${v ? `${v}% off` : "A percentage off"} ${target}`; break;
            case "fixed": lead = `${v ? `${money(v)} off` : "An amount off"} ${target}`; break;
            case "free_shipping": lead = "Free delivery on the order"; break;
            case "sale_price": lead = `${v ? `A sale price of ${money(v)}` : "A sale price"} on ${target}`; break;
            default: lead = `Buy ${f.buyQty || "?"}, get ${f.getQty || "?"} free on ${target}`;
        }
    } else {
        const v = f.value.trim();
        lead = v ? `${f.autoType === "PERCENTAGE" ? `${v}% off` : `${money(v)} off`} ${target}` : `A discount on ${target}`;
    }
    let cond = "";
    if (f.condition === "min" && f.minTotal.trim()) cond = `, on orders over ${money(f.minTotal)}`;
    if (f.condition === "qty" && f.minQty.trim()) {
        const per = f.qtyScope === "PER_PRODUCT" ? " of the same product" : f.applies === "ALL_PRODUCTS" ? "" : " of them";
        cond = `, when they buy ${f.minQty} or more${per}`;
        if (f.minTotal.trim()) cond += ` and the order is over ${money(f.minTotal)}`;
    }
    parts.push(`${lead}${cond}.`);
    if (f.kind === "code") {
        const limit = f.limit.trim() ? `Up to ${f.limit.trim()} ${Number(f.limit) === 1 ? "use" : "uses"}` : "No limit on uses";
        parts.push(`${limit}${f.oncePerCustomer ? ", once per customer" : ""}.`);
    } else {
        parts.push("Applies by itself, no code needed.");
    }
    const startIso = fromLocalInput(f.start);
    if (startIso && t(startIso)! > now.getTime() + 60_000) parts.push(`Starts ${dateText(startIso)}.`);
    const endIso = f.hasEnd ? fromLocalInput(f.end) : null;
    parts.push(endIso ? `Ends ${dateText(endIso)}.` : "No end date.");
    return parts.join(" ");
}

/** "/discounts/<id>" with the list's query kept, so closing the panel lands back on the same view. */
export const discountHref = (id: string, search = "") => `/discounts/${encodeURIComponent(id)}${search}`;
export function idFromPath(pathname: string): string | null {
    const m = /^\/discounts\/([^/?#]+)/.exec(pathname);
    return m ? decodeURIComponent(m[1]) : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const str = (v: unknown, max: number) => (typeof v === "string" ? v : v == null ? "" : String(v)).slice(0, max);
const pick = <T extends string>(v: unknown, opts: readonly T[], dflt: T): T => (opts.includes(v as T) ? (v as T) : dflt);

/**
 * A form that came from the browser, made safe to validate and save on the
 * server: known enums only, ids that look like ids, bounded strings. The
 * browser sends start and end as ISO strings (it knows the staff's time zone).
 */
export function cleanForm(input: unknown, kind: Kind): DiscountForm {
    const f = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
    const ids = (v: unknown) => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && UUID.test(x)))].slice(0, 500) : []);
    return {
        kind,
        code: normaliseCode(str(f.code, 40)),
        title: str(f.title, 120).replace(/\s+/g, " ").trim(),
        codeType: pick(f.codeType, Object.keys(CODE_TYPE_LABEL) as CodeType[], "percentage"),
        autoType: pick(f.autoType, ["PERCENTAGE", "FIXED"] as const, "PERCENTAGE"),
        value: str(f.value, 12).trim(),
        buyQty: str(f.buyQty, 6).trim(),
        getQty: str(f.getQty, 6).trim(),
        applies: pick(f.applies, ["ALL_PRODUCTS", "SPECIFIC_CATEGORIES", "SPECIFIC_PRODUCTS"] as const, "ALL_PRODUCTS"),
        categoryIds: ids(f.categoryIds),
        productIds: ids(f.productIds),
        condition: pick(f.condition, ["none", "min", "qty"] as const, "none"),
        minTotal: str(f.minTotal, 12).trim(),
        minQty: str(f.minQty, 6).trim(),
        qtyScope: pick(f.qtyScope, ["ACROSS_TARGET", "PER_PRODUCT"] as const, "ACROSS_TARGET"),
        start: str(f.start, 40),
        hasEnd: f.hasEnd === true,
        end: str(f.end, 40),
        limit: str(f.limit, 9).trim(),
        oncePerCustomer: f.oncePerCustomer === true,
        isActive: f.isActive !== false,
    };
}

/** What the browser sends to save: the form with start and end turned into ISO strings here, in the staff's own time zone. */
export function formForServer(f: DiscountForm): DiscountForm {
    return { ...f, start: fromLocalInput(f.start) ?? "", end: f.hasEnd ? fromLocalInput(f.end) ?? "" : "" };
}

export type OverlapBanner = { key: string; title: string; body: string; reviewId: string };

const CODE_AUTO_RULE = "On items an automatic discount covers, the checkout takes the automatic discount and a code comes off the rest of the cart only. If every item in the cart has an automatic discount, the code can't be used.";
const plural = (n: number, w: string) => `${n} ${n === 1 ? w : `${w}s`}`;

/**
 * Overlaps as banners. Two automatic discounts on the same items get a banner
 * each: that is a real choice the checkout makes between them. Codes reach
 * every item, so every live code meets every live automatic discount; listing
 * each pair would bury the page, so those become one banner that says the rule
 * once and names who it affects. `focus` narrows it to one discount's panel.
 */
export function overlapBanners(list: Overlap[], focus?: string): OverlapBanner[] {
    const mine = focus ? list.filter(o => o.a.id === focus || o.b.id === focus) : list;
    const autoPairs = mine.filter(o => o.a.kind === "auto" && o.b.kind === "auto");
    const mixed = mine.filter(o => o.a.kind !== o.b.kind);
    const out: OverlapBanner[] = autoPairs.map(o => {
        const other = focus ? (o.a.id === focus ? o.b : o.a) : null;
        return {
            key: `${o.a.id}-${o.b.id}`,
            title: other ? `Overlaps with “${other.name}” on ${o.what}` : o.title,
            body: o.body,
            reviewId: other ? other.id : o.a.id,
        };
    });
    if (mixed.length === 1) {
        const o = mixed[0];
        const other = focus ? (o.a.id === focus ? o.b : o.a) : null;
        out.push({ key: `${o.a.id}-${o.b.id}`, title: other ? `Overlaps with ${quoted(other)} on ${o.what}` : o.title, body: o.body, reviewId: other ? other.id : o.b.id });
    } else if (mixed.length > 1) {
        const codes = [...new Map(mixed.map(o => [o.a.id, o.a])).values()];
        const autos = [...new Map(mixed.map(o => [o.b.id, o.b])).values()];
        const autoNames = listNames(autos.map(quoted));
        const codeNames = listNames(codes.map(quoted));
        const focused = focus ? (codes.find(c => c.id === focus) ?? autos.find(a => a.id === focus)) : null;
        if (focused?.kind === "code") {
            out.push({ key: "codes", title: `Overlaps with ${plural(autos.length, "automatic discount")}`, body: `${autoNames} can apply to the same items while this code is live. ${CODE_AUTO_RULE}`, reviewId: autos[0].id });
        } else if (focused?.kind === "auto") {
            out.push({ key: "codes", title: `Overlaps with ${plural(codes.length, "code")}`, body: `${codeNames} can be used while this is on. ${CODE_AUTO_RULE}`, reviewId: codes[0].id });
        } else {
            out.push({
                key: "codes",
                title: `${plural(codes.length, "code")} and ${plural(autos.length, "automatic discount")} are live together`,
                body: `${codeNames} can be used while ${autoNames} ${autos.length === 1 ? "is" : "are"} on. ${CODE_AUTO_RULE}`,
                reviewId: autos[0].id,
            });
        }
    }
    return out;
}
