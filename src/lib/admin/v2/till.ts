// Admin v2 Till: the sale's arithmetic, the request bodies the till sends and
// the checks it runs before sending. Pure, so the page, the tests and the old
// till can be compared line by line.
//
// The money path does not change. The new till calls the same routes as the old
// one (/api/inventory/check, /api/pos/session, /api/pos/send-link,
// /api/checkout/validate-code, /api/pos/cancel) with the same bodies, built
// here. send-link re-prices everything on the server and is what is charged;
// tillTotals() mirrors its arithmetic so the amount on the button is the amount
// the order records (see memory: verify-every-rendering-surface).
import type { PosAppliedDiscount, PosDeliveryMethod, PosItem } from "@/types/pos";
import { splitAppliedCode } from "@/lib/couponValue";
import type { DeliveryZone } from "@/lib/delivery";
import { variantKey } from "@/lib/utils/normAttr";

/** send-link's rounding: parseFloat(x.toFixed(2)). */
export const round2 = (n: number) => parseFloat(n.toFixed(2));

/** The unit price send-link charges for a product: the sale price when it's on sale. */
export function chargedUnitPrice(p: { price_ghs: number | string; is_sale?: boolean | null; discount_value?: number | string | null }): number {
    const price = Number(p.price_ghs) || 0;
    const dv = Number(p.discount_value) || 0;
    return p.is_sale && dv > 0 ? price * (1 - dv / 100) : price;
}

export type CodeLineIn = { productId: string; unitPrice: number; quantity: number };

/** The basket as an item code prices it (the till applies no automatic discounts, so no line is covered). */
export const codeLines = (cart: readonly PosItem[]): CodeLineIn[] =>
    cart.map(i => ({ productId: i.productId, unitPrice: i.price, quantity: i.quantity }));

export type TillTotals = {
    goods: number;
    deliveryFee: number;
    /** What the code is worth in all (goods + delivery). */
    discount: number;
    deliveryDiscount: number;
    payableDelivery: number;
    /** The processing fee, on the goods after the code, as send-link adds it (cash and pay links alike). */
    fee: number;
    total: number;
};

/**
 * The sale's totals, computed exactly as /api/pos/send-link computes the amount
 * it records (and, for a pay link, charges):
 *   discountedSubtotal = goods − the code's goods part
 *   payableDelivery    = delivery − the code's delivery part
 *   fee                = discountedSubtotal × fee% (rounded)
 *   total              = discountedSubtotal + fee + payableDelivery
 */
export function tillTotals(args: {
    cart: readonly PosItem[];
    deliveryFee: number;
    applied: PosAppliedDiscount | null;
    feePct: number;
}): TillTotals {
    const goods = args.cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const deliveryFee = args.deliveryFee;
    const split = args.applied
        ? splitAppliedCode(args.applied, { subtotal: goods, deliveryFee, lines: codeLines(args.cart) })
        : { amount: 0, subtotalAmount: 0, deliveryAmount: 0 };
    const discountedSubtotal = round2(Math.max(0, goods - (split.subtotalAmount ?? 0)));
    const payableDelivery = round2(Math.max(0, deliveryFee - Math.min(split.deliveryAmount ?? 0, deliveryFee)));
    const feePct = Number(args.feePct) || 0;
    const fee = feePct > 0 ? round2(discountedSubtotal * feePct / 100) : 0;
    const total = round2(discountedSubtotal + fee + payableDelivery);
    return { goods, deliveryFee, discount: split.amount ?? 0, deliveryDiscount: split.deliveryAmount ?? 0, payableDelivery, fee, total };
}

/** Body for POST /api/checkout/validate-code (the preview; send-link re-checks the code). */
export function validateCodeBody(code: string, cart: readonly PosItem[], deliveryFee: number, who?: { email?: string | null; phone?: string | null }) {
    const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    return { code, subtotal, deliveryFee, email: who?.email ?? null, phone: who?.phone ?? null, items: codeLines(cart) };
}

/** validate-code's reply as the till keeps it, or the reason it was refused. */
export function codeFromReply(data: any): PosAppliedDiscount | string {
    if (!data?.valid) return typeof data?.error === "string" ? data.error : "Code not found or invalid.";
    return {
        code: data.code,
        type: data.type,
        discount_type: data.discount_type,
        discount_amount: Number(data.discount_amount) || 0,
        raw_value: data.raw_value != null ? Number(data.raw_value) : undefined,
        label: data.label ?? "Discount applied",
        terms: data.terms ?? null,
        line_categories: data.line_categories ?? null,
    };
}

/** The ?items= list for GET /api/inventory/check, exactly as the old till builds it. */
export const stockCheckItems = (cart: readonly PosItem[]) => cart.map(i => ({
    productId: i.productId,
    variantId: i.variantId,
    size: i.size ?? undefined,
    color: i.color ?? undefined,
    brand: i.brand ?? undefined,
    quantity: i.quantity,
}));

export type TillCustomer = { id: string | null; name: string; email: string | null; phone: string | null };
export type CustomerMode = "search" | "new";

export type SaleDraft = {
    cart: PosItem[];
    customerMode: CustomerMode;
    contact: TillCustomer | null;
    newCustomer: { name: string; email: string };
    phone: string;
    deliveryMethod: PosDeliveryMethod;
    address: string;
    country: string;
    region: string;
    zone: DeliveryZone;
    applied: PosAppliedDiscount | null;
    notes: string;
};

/** Body for POST /api/pos/session, field for field what the old till sends. */
export function sessionBody(s: SaleDraft) {
    const customer = s.customerMode === "search" ? s.contact! : s.newCustomer;
    const delivery = s.deliveryMethod === "delivery";
    return {
        customer_name: customer.name,
        customer_email: customer.email?.trim() || null,
        customer_phone: s.phone.trim() || null,
        customer_address: delivery ? s.address.trim() : null,
        customer_country: delivery ? s.country : null,
        customer_region: delivery ? s.region.trim() : null,
        contact_id: s.customerMode === "search" ? (s.contact?.id ?? undefined) : undefined,
        delivery_method: s.deliveryMethod,
        delivery_zone: delivery ? s.zone : null,
        discount_code: s.applied?.code ?? null,
        items: s.cart,
        notes: s.notes,
    };
}

export type SendMode = "link" | "cash";
/** Body for POST /api/pos/send-link. Send again posts the same body for the same session. */
export const sendLinkBody = (sessionId: string, mode: SendMode, saleKey: string) => ({ sessionId, mode, saleKey });

/** The email the sale will use: the chosen customer's, or the one typed for a new customer. */
export const saleEmail = (s: Pick<SaleDraft, "customerMode" | "contact" | "newCustomer">) =>
    ((s.customerMode === "search" ? s.contact?.email : s.newCustomer.email) ?? "").trim();

/**
 * The checks the old till runs before it sends anything, in the same order, in
 * the new till's words. Null when the sale can go.
 */
export function saleProblem(s: SaleDraft, mode: SendMode): string | null {
    if (s.cart.length === 0) return "Add something to the sale first.";
    if (s.customerMode === "search") {
        if (!s.contact) return "Choose the customer first.";
    } else if (!s.newCustomer.name.trim()) return "Add the customer's name.";
    const email = saleEmail(s);
    if (mode === "cash") {
        if (!s.phone.trim() && !email) return "Add a phone number or email so the customer gets their order number.";
    } else if (!s.phone.trim()) return "Add the customer's phone. The pay link goes by text.";
    if (s.phone.trim() && s.phone.replace(/\D/g, "").length < 9) return "That phone number looks incomplete.";
    if (s.deliveryMethod === "delivery" && !s.address.trim()) return "Add the delivery address.";
    return null;
}

/** /api/inventory/check results → what's wrong with the cart, line by line (the old till's wording). */
export function stockProblems(results: unknown[], cart: readonly PosItem[]): string[] {
    const issues: string[] = [];
    results.forEach((result: any, idx: number) => {
        const line = cart[idx];
        if (!line) return;
        if (!result.isActive) {
            issues.push(`"${line.name}" is no longer available.`);
        } else if (!result.preorderEnabled && result.available < line.quantity) {
            const variant = [line.size, line.color, line.brand].filter(Boolean).join(" / ");
            const lineLabel = `"${line.name}"${variant ? ` (${variant})` : ""}`;
            issues.push(result.available === 0 ? `${lineLabel} is sold out.` : `${lineLabel} only has ${result.available} left.`);
        }
    });
    return issues;
}

/** Adds one unit of a pick to the cart: the same line again, or a new line. */
export function addToCart(cart: readonly PosItem[], product: { id: string; name: string; price: number }, pick: { size: string | null; color: string | null; brand: string | null }): PosItem[] {
    const same = (i: PosItem) => i.productId === product.id && i.size === pick.size && i.color === pick.color && (i.brand ?? null) === pick.brand;
    if (cart.some(same)) return cart.map(i => (same(i) ? { ...i, quantity: i.quantity + 1 } : i));
    return [...cart, { productId: product.id, variantId: null, name: product.name, size: pick.size, color: pick.color, brand: pick.brand, price: product.price, quantity: 1 }];
}

/** "4:05". */
export function mmss(ms: number): string {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Up to three round amounts to offer as "cash received" chips: the next 50, 100, 200 and 500 up. */
export function quickCash(total: number): number[] {
    if (!(total > 0)) return [];
    return [50, 100, 200, 500].map(step => (Math.floor(total / step) + 1) * step).filter((v, i, a) => a.indexOf(v) === i && v > total).slice(0, 3);
}

/** Change to give (positive) or how much is short (negative), to the pesewa. */
export const changeDue = (received: number, total: number) => round2(received - total);

/** When the till can't tell if a sale went through. Cash may already be recorded, so never invite a blind retry. */
export function unclearText(mode: SendMode): string {
    return mode === "cash"
        ? "We couldn't confirm the cash sale. Check Today's sales before trying again, so it isn't recorded twice."
        : "The till couldn't reach the server. Please try again.";
}

// ── The product grid ────────────────────────────────────────────────────────

export type TillVariant = { size: string | null; color: string | null; brand: string | null; available: number };
export type TillProduct = {
    id: string;
    name: string;
    sku: string | null;
    /** What send-link charges a unit (the sale price when on sale). */
    price: number;
    /** The price before a sale, when there is one. */
    wasPrice: number | null;
    image: string | null;
    sizes: string[];
    colors: string[];
    brands: string[];
    preorder: boolean;
    /** Stock is counted at all. */
    tracked: boolean;
    /** Stock is counted per size, colour and brand. */
    variantTracked: boolean;
    /** Units free to sell now, net of every hold. Null when stock isn't counted. */
    available: number | null;
    variants: TillVariant[];
};

/** Free stock for one pick, matched the way send-link matches a line to its variant row. Null: no such variant. */
export function variantAvailable(p: Pick<TillProduct, "id" | "variants">, pick: { size: string | null; color: string | null; brand: string | null }): number | null {
    const key = variantKey(p.id, pick);
    const v = p.variants.find(x => variantKey(p.id, x) === key);
    return v ? v.available : null;
}

/** What a tile says about stock, and whether it can be tapped. */
export function tileStock(p: Pick<TillProduct, "preorder" | "available" | "tracked">): { text: string | null; soldOut: boolean } {
    if (p.preorder) return { text: "Pre-order", soldOut: false };
    if (!p.tracked || p.available == null) return { text: null, soldOut: false };
    if (p.available <= 0) return { text: "Sold out", soldOut: true };
    return { text: `${p.available} left`, soldOut: false };
}

// ── Today's sales ───────────────────────────────────────────────────────────

export const SALES_PAGE_SIZE = 50;
export type SaleStatus = "all" | "draft" | "pending_payment" | "paid" | "expired" | "cancelled";
export const SALE_STATUSES: readonly { v: SaleStatus; l: string }[] = [
    { v: "all", l: "All" },
    { v: "pending_payment", l: "Waiting for payment" },
    { v: "paid", l: "Paid" },
    { v: "draft", l: "Not sent" },
    { v: "expired", l: "Expired" },
    { v: "cancelled", l: "Cancelled" },
];
export type SalesWhen = "today" | "yesterday" | "7d" | "all" | "dates";
export const SALES_WHEN: readonly { v: SalesWhen; l: string }[] = [
    { v: "today", l: "Today" },
    { v: "yesterday", l: "Yesterday" },
    { v: "7d", l: "Last 7 days" },
    { v: "all", l: "All dates" },
    { v: "dates", l: "Choose dates" },
];

export type SalesQuery = { status: SaleStatus; when: SalesWhen; from: string; to: string; staff: string; q: string; page: number };

type Params = URLSearchParams | Record<string, string | string[] | undefined>;
function get(sp: Params, k: string): string {
    if (sp instanceof URLSearchParams) return sp.get(k) ?? "";
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v) ?? "";
}
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseSalesQuery(sp: Params): SalesQuery {
    const status = get(sp, "status");
    const when = get(sp, "when");
    const from = get(sp, "from");
    const to = get(sp, "to");
    const staff = get(sp, "staff");
    return {
        status: SALE_STATUSES.some(s => s.v === status) ? status as SaleStatus : "all",
        // Dates given without a "when" (an old bookmark) mean "Choose dates".
        when: SALES_WHEN.some(w => w.v === when) ? when as SalesWhen : (DATE.test(from) || DATE.test(to) ? "dates" : "today"),
        from: DATE.test(from) ? from : "",
        to: DATE.test(to) ? to : "",
        staff: UUID.test(staff) ? staff : "",
        q: get(sp, "q").slice(0, 80),
        page: Math.max(1, Number.parseInt(get(sp, "page"), 10) || 1),
    };
}

export function salesHref(q: SalesQuery, patch: Partial<SalesQuery> = {}): string {
    const n = { ...q, page: 1, ...patch };
    const p = new URLSearchParams();
    if (n.status !== "all") p.set("status", n.status);
    if (n.when !== "today") p.set("when", n.when);
    if (n.when === "dates" && n.from) p.set("from", n.from);
    if (n.when === "dates" && n.to) p.set("to", n.to);
    if (n.staff) p.set("staff", n.staff);
    if (n.q.trim()) p.set("q", n.q.trim());
    if (n.page > 1) p.set("page", String(n.page));
    const s = p.toString();
    return s ? `/till/today?${s}` : "/till/today";
}

/** Accra's calendar day (GMT all year) for an instant, as YYYY-MM-DD. */
export const accraDay = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Africa/Accra" });
const dayStart = (d: string) => `${d}T00:00:00.000Z`;
const addDays = (d: string, n: number) => { const x = new Date(`${d}T00:00:00.000Z`); x.setUTCDate(x.getUTCDate() + n); return accraDay(x); };

/** The created_at bounds a query covers, half-open [from, to). Null ends are open. */
export function salesRange(q: Pick<SalesQuery, "when" | "from" | "to">, now = new Date()): { from: string | null; to: string | null } {
    const today = accraDay(now);
    switch (q.when) {
        case "today": return { from: dayStart(today), to: dayStart(addDays(today, 1)) };
        case "yesterday": return { from: dayStart(addDays(today, -1)), to: dayStart(today) };
        case "7d": return { from: dayStart(addDays(today, -6)), to: dayStart(addDays(today, 1)) };
        case "dates": return { from: q.from ? dayStart(q.from) : null, to: q.to ? dayStart(addDays(q.to, 1)) : null };
        default: return { from: null, to: null };
    }
}

/** A session's status as the team says it. A link past its hold reads as expired before the sweep marks it. */
export function saleStatusLabel(s: { status: string; expires_at: string | null }, now = Date.now()): { label: string; tone: "ok" | "warn" | "neutral" | "info" } {
    if (s.status === "paid") return { label: "Paid", tone: "ok" };
    if (s.status === "pending_payment") {
        if (s.expires_at && Date.parse(s.expires_at) < now) return { label: "Expired", tone: "neutral" };
        return { label: "Waiting for payment", tone: "warn" };
    }
    if (s.status === "draft") return { label: "Not sent", tone: "neutral" };
    if (s.status === "expired") return { label: "Expired", tone: "neutral" };
    if (s.status === "cancelled") return { label: "Cancelled", tone: "neutral" };
    return { label: s.status, tone: "neutral" };
}

/** How a till sale was paid, from the session and its order. */
export function paidByLabel(s: { status: string; payment_method?: string | null; paystack_reference?: string | boolean | null }, orderMethod?: string | null): string {
    if (s.status === "paid") {
        const m = orderMethod ?? s.payment_method;
        if (m === "cash") return "Cash";
        if (m === "gift_card") return "Gift card";
        return "Pay link";
    }
    if (s.status === "pending_payment" || s.paystack_reference) return "Pay link";
    return "—";
}

/** A session's short ref, as the old history showed it. */
export const saleRef = (id: string) => id.slice(0, 8).toUpperCase();

/** Only an unpaid, open session can be cancelled (the cancel route's own rule). */
export const canCancel = (status: string) => status === "draft" || status === "pending_payment";
