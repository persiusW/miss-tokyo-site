import { fetchOrderStats } from "@/lib/utils/metrics";
import { OrdersClient } from "./OrdersClient";
import { fetchOrdersPage, type OrderTab, ORDER_TABS } from "./ordersQuery";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OrdersPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string; q?: string; page?: string }>;
}) {
    const sp = await searchParams;
    const validTabs = ORDER_TABS.map(t => t.key);
    const tab: OrderTab = validTabs.includes(sp.tab as OrderTab) ? (sp.tab as OrderTab) : "all";
    const search = sp.q ?? "";
    const page = Math.max(1, Number(sp.page) || 1);

    const [ordersPage, stats] = await Promise.all([
        fetchOrdersPage(tab, search, page),
        fetchOrderStats(),
    ]);

    return (
        <div className="space-y-6">
            <header>
                <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Orders</h1>
                <p className="text-neutral-500">All customer orders and their fulfilment status.</p>
            </header>

            {/* Summary Cards — sourced from metrics.ts (matches Overview & Analytics) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-white border border-neutral-200 p-6">
                    <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-4 block">Total Revenue</span>
                    <span className="text-3xl font-serif">GH₵ {stats.totalRevenue.toFixed(2)}</span>
                    <span className="text-[10px] text-neutral-400 mt-2 block tracking-wider">
                        PAID · PROCESSING · FULFILLED
                    </span>
                </div>
                <div className="bg-white border border-neutral-200 p-6">
                    <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-4 block">Unfulfilled</span>
                    <span className="text-3xl font-serif text-amber-600">
                        {stats.pendingCount + stats.processingCount}
                    </span>
                    <span className="text-[10px] text-neutral-400 mt-2 block tracking-wider">
                        {stats.pendingCount} PENDING · {stats.processingCount} PROCESSING
                    </span>
                </div>
                <div className="bg-white border border-neutral-200 p-6">
                    <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-4 block">Fulfilled</span>
                    <span className="text-3xl font-serif text-green-700">{stats.fulfilledCount}</span>
                    <span className="text-[10px] text-neutral-400 mt-2 block tracking-wider">SHIPPED · DELIVERED</span>
                </div>
                <div className="bg-white border border-neutral-200 p-6">
                    <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-4 block">Cancelled</span>
                    <span className="text-3xl font-serif text-neutral-500">{stats.cancelledCount}</span>
                    <span className="text-[10px] text-neutral-400 mt-2 block tracking-wider">
                        CANCELLED · REFUNDED
                    </span>
                </div>
            </div>

            <OrdersClient
                orders={ordersPage.orders}
                tab={ordersPage.tab}
                search={ordersPage.search}
                page={ordersPage.page}
                pageSize={ordersPage.pageSize}
                totalCount={ordersPage.totalCount}
                tabCounts={ordersPage.tabCounts}
            />
        </div>
    );
}
