"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const STATUS_STYLES: Record<string, string> = {
    paid:        "bg-green-50 text-green-700",
    packed:      "bg-blue-50 text-blue-700",
    shipped:     "bg-indigo-50 text-indigo-700",
    processing:  "bg-blue-50 text-blue-700",
    pending:     "bg-amber-50 text-amber-700",
    fulfilled:   "bg-emerald-50 text-emerald-700",
    delivered:   "bg-emerald-100 text-emerald-800",
    cancelled:   "bg-red-50 text-red-600",
    refunded:    "bg-neutral-100 text-neutral-600",
};

type Order = {
    id: string;
    created_at: string;
    total_amount: number | null;
    status: string;
    assigned_rider_id: string | null;
    paystack_reference: string | null;
};

type Rider = {
    full_name: string;
    phone_number: string;
};

export default function AccountOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [riders, setRiders] = useState<Record<string, Rider>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!user) return;

            const { data: orderData } = await supabase
                .from("orders")
                .select("id, created_at, total_amount, status, assigned_rider_id, paystack_reference")
                .eq("customer_id", user.id)
                .order("created_at", { ascending: false });

            const allOrders = orderData ?? [];
            setOrders(allOrders);

            const riderIds = [...new Set(allOrders.map(o => o.assigned_rider_id).filter(Boolean))] as string[];
            if (riderIds.length > 0) {
                const { data: riderData } = await supabase
                    .from("riders")
                    .select("id, full_name, phone_number")
                    .in("id", riderIds);
                const map: Record<string, Rider> = {};
                (riderData ?? []).forEach(r => { map[r.id] = r; });
                setRiders(map);
            }

            setLoading(false);
        });
    }, []);

    if (loading) return <p className="text-neutral-400 italic font-serif">Loading...</p>;

    return (
        <div>
            <h2 className="font-serif text-xl tracking-widest uppercase mb-8">Order History</h2>

            {orders.length === 0 ? (
                <p className="text-neutral-500 italic font-serif text-center py-16">You have no orders yet.</p>
            ) : (
                <div className="space-y-4">
                    {orders.map(order => {
                        const rider = order.assigned_rider_id ? riders[order.assigned_rider_id] : null;
                        const isShipped = order.status === "shipped" || order.status === "processing";
                        return (
                            <div key={order.id} className="border border-neutral-200 bg-white p-6">
                                <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
                                    <div>
                                        <p className="font-mono text-xs text-neutral-500 mb-1">
                                            ORDER #{order.id.substring(0, 8).toUpperCase()}
                                        </p>
                                        <p className="text-xs text-neutral-400">
                                            {new Date(order.created_at).toLocaleDateString("en-GH", {
                                                year: "numeric", month: "long", day: "numeric",
                                            })}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-medium text-sm">
                                            GH₵ {Number(order.total_amount ?? 0).toFixed(2)}
                                        </span>
                                        <span className={`px-2 py-1 text-[10px] uppercase tracking-widest rounded ${STATUS_STYLES[order.status] ?? "bg-neutral-100 text-neutral-600"}`}>
                                            {order.status}
                                        </span>
                                    </div>
                                </div>

                                {isShipped && rider && (
                                    <div className="bg-indigo-50 border border-indigo-100 px-4 py-3 mt-3 text-xs">
                                        <p className="font-semibold uppercase tracking-widest text-indigo-700 mb-1">Dispatch Rider</p>
                                        <p className="text-indigo-600">{rider.full_name} · {rider.phone_number}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
