// The ⌘K search, shared by the old and the new command palette.
//
// Every query runs against the whole table: an order is found by the ref
// printed on its receipt (or its Paystack reference), a product by a
// variant-level SKU, a customer by any of name / email / phone, so results
// never depend on which page of which list happens to be loaded.
import { supabase } from "@/lib/supabase";
import { buildSearchClause, isMissingColumn, sanitiseTerm } from "@/lib/refSearch";

export type PaletteHit =
    | { kind: "order"; id: string; ref: string | null; name: string | null; email: string | null; total: number | null; status: string | null; payment_status: string | null; fulfillment_status: string | null; delivery_method: string | null }
    | { kind: "product"; id: string; name: string | null; sku: string | null; price: number | null }
    | { kind: "customer"; id: string; name: string | null; email: string; phone: string | null };

const PER_GROUP = 5;

export async function paletteSearch(raw: string): Promise<PaletteHit[]> {
    const q = sanitiseTerm(raw);
    if (q.length < 2) return [];

    // `ref` may not be migrated in yet; naming a missing column fails the
    // whole or(), so the orders leg retries without it.
    const orderTextCols = ["customer_name", "customer_email", "customer_phone", "paystack_reference"];
    const ordersQuery = (includeRef: boolean) => supabase
        .from("orders")
        .select(includeRef
            ? "id, ref, customer_name, customer_email, total_amount, status, payment_status, fulfillment_status, delivery_method"
            : "id, customer_name, customer_email, total_amount, status, payment_status, fulfillment_status, delivery_method")
        .or(buildSearchClause(q, orderTextCols, { includeRef }))
        .order("created_at", { ascending: false })
        .limit(PER_GROUP);

    const [ordersFirst, products, contacts] = await Promise.all([
        ordersQuery(true),
        supabase
            .from("products")
            .select("id, name, sku, price_ghs")
            .or(`name.ilike.%${q}%,sku.ilike.%${q}%`)
            .order("created_at", { ascending: false })
            .limit(PER_GROUP),
        supabase
            .from("contact_directory")
            .select("id, name, email, phone")
            .or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
            .order("created_at", { ascending: false })
            .limit(PER_GROUP),
    ]);

    const orders = isMissingColumn(ordersFirst.error, "ref") ? await ordersQuery(false) : ordersFirst;

    type OrderRow = { id: string; ref?: string | null; customer_name: string | null; customer_email: string | null; total_amount: number | null; status: string | null; payment_status: string | null; fulfillment_status: string | null; delivery_method: string | null };
    const out: PaletteHit[] = [];
    for (const o of ((orders.data ?? []) as unknown as OrderRow[])) {
        out.push({ kind: "order", id: o.id, ref: o.ref ?? null, name: o.customer_name, email: o.customer_email, total: o.total_amount, status: o.status, payment_status: o.payment_status, fulfillment_status: o.fulfillment_status, delivery_method: o.delivery_method });
    }
    for (const p of (products.data ?? [])) out.push({ kind: "product", id: p.id, name: p.name, sku: p.sku, price: p.price_ghs });
    for (const c of (contacts.data ?? [])) out.push({ kind: "customer", id: c.id, name: c.name, email: c.email, phone: c.phone });
    return out;
}
