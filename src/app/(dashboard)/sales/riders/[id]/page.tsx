import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATUS_STYLES: Record<string, string> = {
    shipped:   "bg-blue-50 text-blue-700",
    fulfilled: "bg-green-50 text-green-700",
    delivered: "bg-green-50 text-green-700",
    cancelled: "bg-red-50 text-red-500",
    processing:"bg-yellow-50 text-yellow-700",
};

export default async function RiderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const [riderRes, ordersRes] = await Promise.all([
        supabaseAdmin.from("riders").select("*").eq("id", id).single(),
        supabaseAdmin.from("orders")
            .select("id, customer_name, customer_email, customer_phone, shipping_address, total_amount, status, created_at, delivery_method")
            .eq("assigned_rider_id", id)
            .order("created_at", { ascending: false }),
    ]);

    if (riderRes.error || !riderRes.data) notFound();

    const rider = riderRes.data;
    const orders = ordersRes.data ?? [];

    const delivered   = orders.filter(o => ["fulfilled", "delivered"].includes(o.status)).length;
    const inTransit   = orders.filter(o => o.status === "shipped").length;
    const cancelled   = orders.filter(o => o.status === "cancelled").length;
    const totalRevenue = orders.reduce((s, o) => s + Number(o.total_amount ?? 0), 0);
    const deliveryRate = orders.length > 0 ? ((delivered / orders.length) * 100).toFixed(0) : "0";

    return (
        <div className="space-y-10">
            {/* Back */}
            <Link href="/sales/riders" className="text-xs uppercase tracking-widest text-neutral-400 hover:text-black transition-colors">
                ← All Riders
            </Link>

            {/* Rider header */}
            <div className="flex items-center gap-6">
                {rider.image_url ? (
                    <img src={rider.image_url} alt={rider.full_name} className="w-16 h-16 rounded-full object-cover" />
                ) : (
                    <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center">
                        <span className="text-2xl font-serif text-neutral-400">{rider.full_name.charAt(0)}</span>
                    </div>
                )}
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="font-serif text-3xl tracking-widest uppercase">{rider.full_name}</h1>
                        <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded font-semibold ${rider.is_active ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-400"}`}>
                            {rider.is_active ? "Active" : "Inactive"}
                        </span>
                    </div>
                    <p className="text-neutral-500 text-sm">
                        {rider.phone_number}
                        {rider.bike_reg && <span className="ml-3 font-mono text-neutral-400">{rider.bike_reg}</span>}
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                    { label: "Total Orders",   value: orders.length },
                    { label: "In Transit",     value: inTransit },
                    { label: "Delivered",      value: delivered },
                    { label: "Cancelled",      value: cancelled },
                    { label: "Delivery Rate",  value: `${deliveryRate}%` },
                ].map(({ label, value }) => (
                    <div key={label} className="bg-white border border-neutral-200 p-6">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500 mb-3 block">{label}</span>
                        <span className="text-2xl font-serif">{value}</span>
                    </div>
                ))}
            </div>

            <div className="bg-white border border-neutral-200 p-6">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500 mb-2 block">Total Revenue Handled</span>
                <span className="text-3xl font-serif">GH₵ {totalRevenue.toFixed(2)}</span>
            </div>

            {/* Orders table */}
            <div className="bg-white border border-neutral-200">
                <div className="px-8 py-5 border-b border-neutral-100 flex items-center justify-between">
                    <h2 className="text-xs font-semibold uppercase tracking-widest">Assigned Orders</h2>
                    <span className="text-xs text-neutral-400">{orders.length} orders</span>
                </div>

                {orders.length === 0 ? (
                    <div className="px-8 py-16 text-center text-neutral-400 italic font-serif text-sm">
                        No orders assigned to this rider yet.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-neutral-50 border-b border-neutral-100">
                                <tr>
                                    <th className="px-6 py-3 text-left text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Order</th>
                                    <th className="px-6 py-3 text-left text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Customer</th>
                                    <th className="px-6 py-3 text-left text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Phone</th>
                                    <th className="px-6 py-3 text-left text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Address</th>
                                    <th className="px-6 py-3 text-right text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Amount</th>
                                    <th className="px-6 py-3 text-left text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Status</th>
                                    <th className="px-6 py-3 text-left text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Date</th>
                                    <th className="px-6 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-50">
                                {orders.map(o => {
                                    const ref = o.id.substring(0, 8).toUpperCase();
                                    const addr = (o.shipping_address as any)?.text || (o.shipping_address as any)?.city || "—";
                                    const statusStyle = STATUS_STYLES[o.status] || "bg-neutral-100 text-neutral-500";
                                    return (
                                        <tr key={o.id} className="hover:bg-neutral-50 transition-colors">
                                            <td className="px-6 py-4 font-mono text-xs text-neutral-600">#{ref}</td>
                                            <td className="px-6 py-4 text-neutral-800">{o.customer_name || o.customer_email || "—"}</td>
                                            <td className="px-6 py-4 text-neutral-500 text-xs">{o.customer_phone || "—"}</td>
                                            <td className="px-6 py-4 text-neutral-500 text-xs max-w-[200px] truncate">{addr}</td>
                                            <td className="px-6 py-4 text-right font-medium">GH₵ {Number(o.total_amount).toFixed(2)}</td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded font-semibold ${statusStyle}`}>
                                                    {o.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-neutral-400 text-xs">
                                                {new Date(o.created_at).toLocaleDateString("en-GB")}
                                            </td>
                                            <td className="px-6 py-4">
                                                <Link href={`/sales/orders/${o.id}`}
                                                    className="text-[10px] uppercase tracking-widest text-neutral-400 hover:text-black transition-colors">
                                                    View →
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
