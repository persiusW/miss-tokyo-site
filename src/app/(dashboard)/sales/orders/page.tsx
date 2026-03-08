import Link from "next/link";
import { supabase } from "@/lib/supabase";

const STATUS_STYLES: Record<string, string> = {
    paid: "bg-green-50 text-green-700",
    pending: "bg-amber-50 text-amber-700",
    cancelled: "bg-red-50 text-red-600",
    refunded: "bg-neutral-100 text-neutral-600",
};

export default async function OrdersPage() {
    const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

    const total = (orders || []).reduce((sum, o) => sum + Number(o.total_amount), 0);
    const paidCount = (orders || []).filter(o => o.status === "paid").length;
    const pendingCount = (orders || []).filter(o => o.status === "pending").length;

    return (
        <div className="space-y-12">
            <header>
                <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Orders</h1>
                <p className="text-neutral-500">All customer orders and their fulfilment status.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-neutral-200 p-6">
                    <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-4 block">Total Value</span>
                    <span className="text-3xl font-serif">GH₵ {total.toFixed(2)}</span>
                </div>
                <div className="bg-white border border-neutral-200 p-6">
                    <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-4 block">Paid</span>
                    <span className="text-3xl font-serif text-green-700">{paidCount}</span>
                </div>
                <div className="bg-white border border-neutral-200 p-6">
                    <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-4 block">Pending</span>
                    <span className="text-3xl font-serif text-amber-600">{pendingCount}</span>
                </div>
            </div>

            <div className="bg-white border border-neutral-200 overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Order ID</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Customer</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500 text-right">Amount</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Status</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Reference</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500 text-right">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {(!orders || orders.length === 0) ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-16 text-center text-neutral-500 italic font-serif">
                                    No orders have been placed yet.
                                </td>
                            </tr>
                        ) : (
                            orders.map((order) => (
                                <tr key={order.id} className="hover:bg-neutral-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <Link href={`/sales/orders/${order.id}`} className="font-mono text-xs text-neutral-600 hover:text-black hover:underline">
                                            {order.id.substring(0, 8).toUpperCase()}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4">
                                        <a href={`mailto:${order.customer_email}`} className="text-neutral-700 hover:text-black hover:underline">
                                            {order.customer_email}
                                        </a>
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium">
                                        GH₵ {Number(order.total_amount).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-[10px] uppercase tracking-widest rounded ${STATUS_STYLES[order.status] || 'bg-neutral-100 text-neutral-600'}`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-xs text-neutral-500">{order.paystack_reference || '—'}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-neutral-500 text-xs">
                                        {new Date(order.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
