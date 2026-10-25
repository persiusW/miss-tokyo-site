// The new Orders pages, for /orders and /orders/<id> (the panel open over the
// list), /orders/abandoned and /orders/invoices[/<id>]. Server components:
// check the role, load the first data, render the client page.
import { Suspense } from "react";
import { Denied } from "@/components/admin/ui";
import { requireV2Page } from "@/lib/admin/v2/server";
import { logCause } from "@/lib/errors/apiError";
import { parseOrdersQuery, type AbandonedRange } from "@/lib/admin/v2/orders";
import {
    loadAbandoned, loadAbandonedCount, loadDocuments, loadOrderDetail, loadOrderList, loadPreorderStats, loadViewCounts,
    type AbandonedData, type OrderDetail,
} from "@/lib/admin/v2/ordersLoad";
import { OrdersPage, type ListData } from "./OrdersPage";
import { AbandonedPage } from "./AbandonedPage";
import { InvoicesPage, type DocsData } from "./InvoicesPage";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export async function OrdersV2({ searchParams, openId }: { searchParams: SP; openId: string | null }) {
    const auth = await requireV2Page("orders", openId ? `/orders/${openId}` : "/orders");
    const query = parseOrdersQuery(searchParams);

    let data: ListData | null = null;
    try {
        const [list, counts, abandoned, pre] = await Promise.all([
            loadOrderList(query), loadViewCounts(query), loadAbandonedCount(), query.preorder ? loadPreorderStats() : Promise.resolve(null),
        ]);
        data = { ...list, counts, abandoned, pre };
    } catch (e) {
        logCause("GEN-00", e, { where: "orders.list" });
    }

    let detail: OrderDetail | null | "error" = null;
    if (openId) {
        try {
            detail = await loadOrderDetail(openId, auth.role);
        } catch (e) {
            logCause("GEN-00", e, { where: "orders.detail" });
            detail = "error";
        }
    }

    return (
        <Suspense>
            <OrdersPage role={auth.role} query={query} data={data} initialId={openId} initialDetail={detail} />
        </Suspense>
    );
}

export async function AbandonedV2({ searchParams }: { searchParams: SP }) {
    const auth = await requireV2Page("orders", "/orders/abandoned");
    const r = one(searchParams.range);
    const range: AbandonedRange = (["today", "7d", "30d", "all"] as const).includes(r as AbandonedRange) ? r as AbandonedRange : "7d";
    const page = Math.max(1, Number.parseInt(one(searchParams.page), 10) || 1);
    let data: AbandonedData | null = null;
    let count: number | null = null;
    try {
        [data, count] = await Promise.all([loadAbandoned(range, page), loadAbandonedCount()]);
    } catch (e) {
        logCause("GEN-00", e, { where: "orders.abandoned" });
    }
    return <AbandonedPage role={auth.role} range={range} page={page} data={data} count={count} />;
}

export async function InvoicesV2({ openId, searchParams }: { openId: string | null; searchParams: SP }) {
    // Owners and admins, as the old Finance pages.
    const auth = await requireV2Page("orders", openId ? `/orders/invoices/${openId}` : "/orders/invoices", ["admin", "owner"]);
    if (!auth.allowed) return <Denied title="Invoices and pay links" />;
    let data: DocsData | null = null;
    try {
        const [docs, abandoned] = await Promise.all([loadDocuments(), loadAbandonedCount()]);
        data = { ...docs, abandoned };
    } catch (e) {
        logCause("GEN-00", e, { where: "orders.invoices" });
    }
    return <InvoicesPage role={auth.role} data={data} openId={openId} startNew={one(searchParams.new) === "1"} linkFilter={one(searchParams.type) === "link"} />;
}
