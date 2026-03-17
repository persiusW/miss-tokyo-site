import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RidersReportPage() {
    const [ridersRes, ordersRes] = await Promise.all([
        supabaseAdmin.from("riders").select("id, full_name, phone_number, bike_reg, image_url, is_active").order("full_name"),
        supabaseAdmin.from("orders").select("id, assigned_rider_id, status, total_amount, created_at").not("assigned_rider_id", "is", null),
    ]);

    const riders = ridersRes.data ?? [];
    const orders = ordersRes.data ?? [];

    type RiderRow = {
        id: string;
        full_name: string;
        phone_number: string;
        bike_reg: string | null;
        image_url: string | null;
        is_active: boolean;
        totalOrders: number;
        delivered: number;
        inTransit: number;
        totalRevenue: number;
        lastDate: string | null;
    };

    const rows: RiderRow[] = riders.map(r => {
        const rOrders = orders.filter(o => o.assigned_rider_id === r.id);
        const delivered = rOrders.filter(o => ["fulfilled", "delivered"].includes(o.status)).length;
        const inTransit = rOrders.filter(o => o.status === "shipped").length;
        const totalRevenue = rOrders.reduce((s, o) => s + Number(o.total_amount ?? 0), 0);
        const dates = rOrders.map(o => o.created_at).sort().reverse();
        return {
            ...r,
            totalOrders: rOrders.length,
            delivered,
            inTransit,
            totalRevenue,
            lastDate: dates[0] ?? null,
        };
    });

    const totalDispatched = orders.length;
    const totalDelivered = orders.filter(o => ["fulfilled", "delivered"].includes(o.status)).length;
    const totalRevenue = orders.reduce((s, o) => s + Number(o.total_amount ?? 0), 0);

    return (
        <div className="space-y-10">
            <header>
                <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Rider Reports</h1>
                <p className="text-neutral-500">Delivery performance across all assigned riders.</p>
            </header>

            {/* Summary KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Active Riders",     value: riders.filter(r => r.is_active).length },
                    { label: "Total Dispatched",  value: totalDispatched },
                    { label: "Total Delivered",   value: totalDelivered },
                    { label: "Revenue Handled",   value: `GH₵ ${totalRevenue.toFixed(2)}` },
                ].map(({ label, value }) => (
                    <div key={label} className="bg-white border border-neutral-200 p-6">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500 mb-3 block">{label}</span>
                        <span className="text-2xl font-serif">{value}</span>
                    </div>
                ))}
            </div>

            {/* Riders table */}
            <div className="bg-white border border-neutral-200">
                <div className="px-8 py-5 border-b border-neutral-100 flex items-center justify-between">
                    <h2 className="text-xs font-semibold uppercase tracking-widest">All Riders</h2>
                    <span className="text-xs text-neutral-400">{rows.length} riders</span>
                </div>

                {rows.length === 0 ? (
                    <div className="px-8 py-16 text-center text-neutral-400 italic font-serif text-sm">
                        No riders found. Add riders in Settings to track dispatch performance.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-neutral-50 border-b border-neutral-100">
                                <tr>
                                    <th className="px-6 py-3 text-left text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Rider</th>
                                    <th className="px-6 py-3 text-left text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Phone</th>
                                    <th className="px-6 py-3 text-left text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Bike Reg</th>
                                    <th className="px-6 py-3 text-center text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Total Orders</th>
                                    <th className="px-6 py-3 text-center text-[10px] uppercase tracking-widest font-semibold text-neutral-400">In Transit</th>
                                    <th className="px-6 py-3 text-center text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Delivered</th>
                                    <th className="px-6 py-3 text-right text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Revenue</th>
                                    <th className="px-6 py-3 text-left text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Status</th>
                                    <th className="px-6 py-3 text-left text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Last Active</th>
                                    <th className="px-6 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-50">
                                {rows.map(r => (
                                    <tr key={r.id} className="hover:bg-neutral-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {r.image_url ? (
                                                    <img src={r.image_url} alt={r.full_name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                                                        <span className="text-xs font-semibold text-neutral-400">{r.full_name.charAt(0)}</span>
                                                    </div>
                                                )}
                                                <span className="font-medium text-neutral-900">{r.full_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-neutral-500 text-xs">{r.phone_number}</td>
                                        <td className="px-6 py-4 text-neutral-500 text-xs font-mono">{r.bike_reg || "—"}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-semibold text-neutral-900">{r.totalOrders}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-xs font-medium ${r.inTransit > 0 ? "text-blue-600" : "text-neutral-400"}`}>{r.inTransit}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-xs font-medium ${r.delivered > 0 ? "text-green-600" : "text-neutral-400"}`}>{r.delivered}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-neutral-800">
                                            {r.totalRevenue > 0 ? `GH₵ ${r.totalRevenue.toFixed(2)}` : "—"}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded font-semibold ${r.is_active ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-400"}`}>
                                                {r.is_active ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-neutral-400 text-xs">
                                            {r.lastDate ? new Date(r.lastDate).toLocaleDateString("en-GB") : "—"}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Link href={`/sales/riders/${r.id}`}
                                                className="text-[10px] uppercase tracking-widest text-neutral-500 hover:text-black border-b border-neutral-200 hover:border-black transition-colors">
                                                View →
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
