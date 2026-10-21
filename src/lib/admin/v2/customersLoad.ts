// Admin v2 Customers data from the database: the list (customer_list, paged
// and counted on the server), the chip counts and one customer's panel.
// Server only (service role); callers check the role first.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normaliseOrderPhone } from "@/lib/phone";
import {
    LIST_COLUMNS, PAGE_SIZE, SEGMENTS, buildActivity, ilikeExact, isPaidOrder, sanitiseSearch,
    type ActivityItem, type CustomerRow, type ListQuery, type Segment,
} from "./customers";

const db = supabaseAdmin as any;

/** The filters every query shares (search, source, dates, tag) plus one segment. */
function filtered(base: any, q: ListQuery, segment: Segment) {
    let x = base;
    const term = sanitiseSearch(q.q);
    if (term) x = x.or(`name.ilike.*${term}*,email.ilike.*${term}*,phone.ilike.*${term}*`);
    if (q.source !== "all") x = x.eq("came_from", q.source);
    // Accra is UTC all year, so a day is the same in the database.
    if (q.from) x = x.gte("first_seen", `${q.from}T00:00:00Z`);
    if (q.to) x = x.lte("first_seen", `${q.to}T23:59:59.999Z`);
    if (q.tag) x = x.contains("tag_keys", [q.tag.toLowerCase()]);
    switch (segment) {
        case "buyers": return x.gt("orders", 0);
        case "never": return x.eq("orders", 0);
        case "vip": return x.contains("tag_keys", ["vip"]);
        case "wholesale": return x.eq("wholesale", true);
        case "email": return x.eq("marketing", true);
        default: return x;
    }
}

function sorted(x: any, q: ListQuery) {
    if (q.sort === "spent") return x.order("spent", { ascending: false }).order("last_seen", { ascending: false }).order("contact_key");
    if (q.sort === "last") return x.order("last_order_at", { ascending: false, nullsFirst: false }).order("last_seen", { ascending: false }).order("contact_key");
    return x.order("last_seen", { ascending: false }).order("contact_key");
}

export type ListResult = { rows: CustomerRow[]; total: number };

const toRow = (r: any): CustomerRow => ({ ...r, spent: Number(r.spent ?? 0), avg_order: r.avg_order == null ? null : Number(r.avg_order), tags: r.tags ?? [] });

/** One page of the list. Throws on a database error (the page shows its error state). */
export async function loadCustomerList(q: ListQuery): Promise<ListResult> {
    const from = (q.page - 1) * PAGE_SIZE;
    const { data, count, error } = await sorted(filtered(db.from("customer_list").select(LIST_COLUMNS, { count: "exact" }), q, q.segment), q)
        .range(from, from + PAGE_SIZE - 1);
    // Past the end (rows went away since the count): an empty page, not an error.
    if (error?.code === "PGRST103") return { rows: [], total: 0 };
    if (error) throw error;
    return { rows: (data ?? []).map(toRow), total: count ?? 0 };
}

/** How many customers each chip holds, with the search and filters applied. */
export async function loadSegmentCounts(q: ListQuery): Promise<Record<Segment, number>> {
    const res = await Promise.all(SEGMENTS.map(s => filtered(db.from("customer_list").select("contact_key", { count: "exact", head: true }), q, s.v)));
    const out = {} as Record<Segment, number>;
    SEGMENTS.forEach((s, i) => {
        if (res[i].error) throw res[i].error;
        out[s.v] = res[i].count ?? 0;
    });
    return out;
}

/** Every tag in use, in the casing the shop uses, for the tag filter and the editor's suggestions. */
export async function loadKnownTags(): Promise<string[]> {
    const { data, error } = await db.from("contact_tags").select("tag").order("tag").limit(1000);
    if (error) throw error;
    const seen = new Map<string, string>();
    for (const r of data ?? []) if (!seen.has(r.tag.toLowerCase())) seen.set(r.tag.toLowerCase(), r.tag);
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

/** Every row the filters match, walked in pages of 1000 (PostgREST's cap), for the export. */
export async function loadAllMatching(q: ListQuery, keys?: string[]): Promise<CustomerRow[]> {
    const out: CustomerRow[] = [];
    if (keys) {
        for (let i = 0; i < keys.length; i += 500) {
            const { data, error } = await db.from("customer_list").select(LIST_COLUMNS).in("contact_key", keys.slice(i, i + 500));
            if (error) throw error;
            out.push(...(data ?? []).map(toRow));
        }
        return out;
    }
    for (let offset = 0; offset < 100_000; offset += 1000) {
        const { data, error } = await sorted(filtered(db.from("customer_list").select(LIST_COLUMNS), q, q.segment), q).range(offset, offset + 999);
        if (error) throw error;
        out.push(...(data ?? []).map(toRow));
        if ((data ?? []).length < 1000) break;
    }
    return out;
}

export async function loadCustomerRow(key: string): Promise<CustomerRow | null> {
    const { data, error } = await db.from("customer_list").select(LIST_COLUMNS).eq("contact_key", key).maybeSingle();
    if (error) throw error;
    return data ? toRow(data) : null;
}

export type PanelOrder = {
    id: string; ref: string | null; total_amount: number; created_at: string; status: string | null; payment_status: string | null;
    fulfillment_status: string | null; delivery_method: string | null; items: number; discount_code: string | null; paid: boolean;
};
export type PanelNote = { id: string; body: string; author: string; author_id: string | null; created_at: string };

export type CustomerDetail = {
    row: CustomerRow;
    orders: PanelOrder[];
    /** The newest paid order's ref, for the Last order KPI. */
    lastPaidRef: string | null;
    address: string | null;
    notes: PanelNote[];
    activity: ActivityItem[];
    /** The newest WhatsApp chat on their number or account, for the WhatsApp button. */
    chatId: string | null;
};

const ORDER_LIMIT = 200;

/** One customer's panel: orders, contact, notes, activity (orders, messages, forms, requests, invoices). */
export async function loadCustomerDetail(key: string): Promise<CustomerDetail | null> {
    const row = await loadCustomerRow(key);
    if (!row) return null;
    const like = ilikeExact(key);

    const [ordersRes, inquiriesRes, formsRes, requestsRes, docsRes, nlRes, nl2Res, contactsRes, profileRes, notesRes] = await Promise.all([
        db.from("orders").select("id, ref, total_amount, status, payment_status, fulfillment_status, delivery_method, created_at, items, discount_code, shipping_address, customer_phone")
            .ilike("customer_email", like).order("created_at", { ascending: false }).limit(ORDER_LIMIT),
        db.from("contact_inquiries").select("id, message, created_at").ilike("email", like).order("created_at", { ascending: false }).limit(50),
        db.from("contact_submissions").select("id, message, submitted_at").ilike("email", like).order("submitted_at", { ascending: false }).limit(50),
        db.from("custom_requests").select("id, details, created_at").ilike("customer_email", like).order("created_at", { ascending: false }).limit(50),
        db.from("documents").select("id, type, amount, status, created_at").ilike("customer_email", like).order("created_at", { ascending: false }).limit(100),
        db.from("newsletter_subscribers").select("subscribed_at").ilike("email", like).order("subscribed_at").limit(1),
        db.from("newsletter_subs").select("created_at").ilike("email", like).order("created_at").limit(1),
        db.from("contacts").select("created_at").ilike("email", like).order("created_at").limit(1),
        row.profile_id ? db.from("profiles").select("created_at, phone, default_address").eq("id", row.profile_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
        db.from("contact_notes").select("id, body, author, created_at").eq("contact_key", key).order("created_at", { ascending: false }).limit(200),
    ]);
    for (const r of [ordersRes, inquiriesRes, formsRes, requestsRes, docsRes, nlRes, nl2Res, contactsRes, profileRes, notesRes]) if (r.error) throw r.error;

    const rawOrders: any[] = ordersRes.data ?? [];
    const orders: PanelOrder[] = rawOrders.map(o => ({
        id: o.id, ref: o.ref ?? null, total_amount: Number(o.total_amount ?? 0), created_at: o.created_at, status: o.status, payment_status: o.payment_status,
        fulfillment_status: o.fulfillment_status, delivery_method: o.delivery_method, discount_code: o.discount_code ?? null,
        items: Array.isArray(o.items) ? o.items.reduce((n: number, i: any) => n + (typeof i?.quantity === "number" ? i.quantity : 1), 0) : 0,
        paid: isPaidOrder(o),
    }));

    // The latest delivery address an order carried, else the account's saved one.
    const shipped = rawOrders.find(o => (o.shipping_address?.text ?? "").trim());
    const profile = profileRes.data as { created_at: string | null; phone: string | null; default_address: any } | null;
    const saved = profile?.default_address && typeof profile.default_address === "object"
        ? [profile.default_address.text ?? profile.default_address.address ?? profile.default_address.street, profile.default_address.region].filter(Boolean).join(", ")
        : "";
    const address = shipped ? [shipped.shipping_address.text.trim(), shipped.shipping_address.region].filter(Boolean).join(", ") : saved || null;

    // WhatsApp chats: by the account, or by any number we know for them.
    const phones = [...new Set([row.phone, profile?.phone, ...rawOrders.map(o => o.customer_phone)].map(p => normaliseOrderPhone(p)).filter(Boolean) as string[])].slice(0, 20);
    const orParts = [...(row.profile_id ? [`customer_id.eq.${row.profile_id}`] : []), ...(phones.length ? [`wa_phone_number.in.(${phones.join(",")})`] : [])];
    let chats: { id: string; created_at: string; last_message_at: string | null }[] = [];
    if (orParts.length) {
        const { data, error } = await db.from("whatsapp_conversations").select("id, created_at, last_message_at").or(orParts.join(",")).order("last_message_at", { ascending: false, nullsFirst: false }).limit(10);
        if (error) throw error;
        chats = data ?? [];
    }

    const authorIds = [...new Set((notesRes.data ?? []).map((n: any) => n.author).filter(Boolean))] as string[];
    const names = new Map<string, string>();
    if (authorIds.length) {
        const { data } = await db.from("profiles").select("id, full_name, email").in("id", authorIds);
        for (const p of data ?? []) names.set(p.id, (p.full_name ?? "").trim() || (p.email ?? "").split("@")[0] || "A team member");
    }
    const notes: PanelNote[] = (notesRes.data ?? []).map((n: any) => ({ id: n.id, body: n.body, author_id: n.author, author: names.get(n.author) ?? "A team member", created_at: n.created_at }));

    const activity = buildActivity({
        orders: orders.map(o => ({ id: o.id, ref: o.ref, total_amount: o.total_amount, created_at: o.created_at, paid: o.paid, cancelled: (o.payment_status ?? o.status) === "cancelled" })),
        forms: [
            ...(formsRes.data ?? []).map((f: any) => ({ id: f.id, message: f.message, at: f.submitted_at, inbox: true })),
            ...(inquiriesRes.data ?? []).map((f: any) => ({ id: f.id, message: f.message, at: f.created_at, inbox: false })),
        ],
        requests: requestsRes.data ?? [],
        invoices: (docsRes.data ?? []).map((d: any) => ({ ...d, amount: d.amount == null ? null : Number(d.amount) })),
        chats,
        accountAt: row.profile_id && row.account_role !== "owner" && row.account_role !== "admin" && row.account_role !== "sales_staff" ? profile?.created_at ?? null : null,
        newsletterAt: nlRes.data?.[0]?.subscribed_at ?? nl2Res.data?.[0]?.created_at ?? null,
        addedAt: contactsRes.data?.[0]?.created_at ?? null,
    });

    return {
        row,
        orders,
        lastPaidRef: orders.find(o => o.paid)?.ref ?? (orders.find(o => o.paid)?.id.slice(0, 8) ?? null),
        address,
        notes,
        activity,
        chatId: chats[0]?.id ?? null,
    };
}
