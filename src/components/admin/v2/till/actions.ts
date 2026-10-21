"use server";

// Till server actions (admin v2). Reads only: products with live stock, the
// customer search, one sale's hold, the last receipt. Server actions are public
// endpoints running on the service role, so each one re-checks the caller's
// role, with the old till's list (admin, owner, sales staff), and sales staff
// read only their own sales. Selling, sending, and cancelling stay on the
// existing /api/pos/* routes.
import { requireStaff } from "@/lib/ai/requireStaff";
import { logCause } from "@/lib/errors/apiError";
import {
    findTillCustomer, loadLastReceipt, loadSaleState, searchTillCustomers, searchTillProducts,
    type SaleState, type TillScope,
} from "@/lib/admin/v2/tillLoad";
import type { TillCustomer, TillProduct } from "@/lib/admin/v2/till";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const DENIED = { ok: false as const, error: "Only the shop's team can do this. Please sign in again." };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function me(): Promise<TillScope | null> {
    const a = await requireStaff(["admin", "owner", "sales_staff"]);
    return "status" in a ? null : a;
}

export async function tillProducts(q: string, categoryId: string | null): Promise<Result<{ products: TillProduct[]; matches: number }>> {
    if (!(await me())) return DENIED;
    try {
        const cat = categoryId && UUID.test(categoryId) ? categoryId : null;
        return { ok: true, ...(await searchTillProducts(String(q ?? "").slice(0, 80), cat)) };
    } catch (e) {
        logCause("GEN-00", e, { where: "till.products" });
        return { ok: false, error: "We couldn't load the products. Please try again." };
    }
}

export async function tillCustomers(q: string): Promise<Result<{ customers: TillCustomer[] }>> {
    if (!(await me())) return DENIED;
    try {
        return { ok: true, customers: await searchTillCustomers(String(q ?? "")) };
    } catch (e) {
        logCause("GEN-00", e, { where: "till.customers" });
        return { ok: false, error: "We couldn't search customers just now. Please try again." };
    }
}

export async function tillCustomer(key: string): Promise<Result<{ customer: TillCustomer | null }>> {
    if (!(await me())) return DENIED;
    try {
        return { ok: true, customer: await findTillCustomer(String(key ?? "")) };
    } catch (e) {
        logCause("GEN-00", e, { where: "till.customer" });
        return { ok: true, customer: null };
    }
}

/** A sale's hold and order, from the database only (no Paystack call). */
export async function tillSaleState(sessionId: string): Promise<Result<{ sale: SaleState | null }>> {
    const scope = await me();
    if (!scope) return DENIED;
    if (!UUID.test(String(sessionId))) return { ok: true, sale: null };
    try {
        return { ok: true, sale: await loadSaleState(sessionId, scope) };
    } catch (e) {
        logCause("GEN-00", e, { where: "till.sale" });
        return { ok: false, error: "We couldn't check this sale just now." };
    }
}

export async function tillLastReceipt(): Promise<Result<{ orderId: string | null }>> {
    const scope = await me();
    if (!scope) return DENIED;
    try {
        return { ok: true, orderId: await loadLastReceipt(scope) };
    } catch (e) {
        logCause("GEN-00", e, { where: "till.last-receipt" });
        return { ok: false, error: "We couldn't find the last receipt. Please try again." };
    }
}
