"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";

type AbandonedOrder = {
    id: string;
    customer_name: string | null;
    customer_email: string | null;
    total_amount: number | null;
    items: any;
    created_at: string;
    reminded?: boolean;
};

type TimeFilter = "today" | "7days" | "month" | "all";

function getStartDate(filter: TimeFilter): string | null {
    const now = new Date();
    switch (filter) {
        case "today":  { const d = new Date(now); d.setHours(0,0,0,0); return d.toISOString(); }
        case "7days":  { const d = new Date(now); d.setDate(d.getDate() - 7); return d.toISOString(); }
        case "month":  { const d = new Date(now); d.setDate(d.getDate() - 30); return d.toISOString(); }
        default:       return null;
    }
}

const TIME_FILTERS: { key: TimeFilter; label: string }[] = [
    { key: "today",  label: "Today" },
    { key: "7days",  label: "7 Days" },
    { key: "month",  label: "30 Days" },
    { key: "all",    label: "All Time" },
];

export default function AbandonedCartsPage() {
    const [orders, setOrders] = useState<AbandonedOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState<TimeFilter>("7days");
    const [sending, setSending] = useState<string | null>(null);
    const [remindedIds, setRemindedIds] = useState<Set<string>>(new Set());

    const fetchAbandoned = async () => {
        setLoading(true);
        const startDate = getStartDate(timeFilter);

        let query = supabase
            .from("orders")
            .select("id, customer_name, customer_email, total_amount, items, created_at")
            .eq("status", "pending")
            .is("paystack_reference", null)
            .order("created_at", { ascending: false });

        if (startDate) {
            query = query.gte("created_at", startDate);
        }

        const { data } = await query;
        setOrders(data ?? []);
        setLoading(false);
    };

    useEffect(() => { fetchAbandoned(); }, [timeFilter]);

    const handleRemind = async (order: AbandonedOrder) => {
        if (!order.customer_email) { toast.error("No email for this customer."); return; }
        setSending(order.id);
        try {
            const res = await fetch("/api/abandoned/remind", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: order.id, customerEmail: order.customer_email, customerName: order.customer_name }),
            });
            if (!res.ok) throw new Error("Send failed");
            toast.success("Reminder sent.");
            setRemindedIds(prev => new Set([...prev, order.id]));

            // Log to abandoned_history
            await supabase.from("abandoned_history").insert([{
                order_id: order.id,
                customer_email: order.customer_email,
                customer_name: order.customer_name,
            }]);
        } catch {
            toast.error("Failed to send reminder.");
        }
        setSending(null);
    };

    const itemCount = (items: any) => {
        if (!items) return "—";
        if (Array.isArray(items)) return `${items.length} item${items.length > 1 ? "s" : ""}`;
        return "—";
    };

    return (
        <div className="space-y-12">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="font-serif text-3xl tracking-widests uppercase mb-2">Abandoned Carts</h1>
                    <p className="text-neutral-500">Orders started but not completed (pending with no payment).</p>
                </div>
                <div className="flex gap-2">
                    {TIME_FILTERS.map(tf => (
                        <button
                            key={tf.key}
                            onClick={() => setTimeFilter(tf.key)}
                            className={`px-4 py-2 text-xs uppercase tracking-widest transition-colors ${
                                timeFilter === tf.key
                                    ? "bg-black text-white"
                                    : "bg-white border border-neutral-200 text-neutral-500 hover:border-black hover:text-black"
                            }`}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>
            </header>

            <div className="bg-white border border-neutral-200 overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Customer</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Email</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500 text-right">Cart Value</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Items</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500 text-right">Date</th>
                            <th className="px-6 py-4 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {loading ? (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-neutral-400 italic font-serif">Loading...</td></tr>
                        ) : orders.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-16 text-center text-neutral-400 italic font-serif">No abandoned carts in this period.</td></tr>
                        ) : orders.map(order => (
                            <tr key={order.id} className="hover:bg-neutral-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-neutral-900">
                                    {order.customer_name || <span className="text-neutral-400 italic">Unknown</span>}
                                </td>
                                <td className="px-6 py-4 text-neutral-600">
                                    {order.customer_email || "—"}
                                </td>
                                <td className="px-6 py-4 text-right font-medium">
                                    GH₵ {Number(order.total_amount ?? 0).toFixed(2)}
                                </td>
                                <td className="px-6 py-4 text-neutral-500 text-xs">{itemCount(order.items)}</td>
                                <td className="px-6 py-4 text-right text-neutral-400 text-xs">
                                    {new Date(order.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {remindedIds.has(order.id) ? (
                                        <span className="text-[10px] uppercase tracking-widest text-green-600">Sent</span>
                                    ) : (
                                        <button
                                            onClick={() => handleRemind(order)}
                                            disabled={sending === order.id || !order.customer_email}
                                            className="text-[10px] uppercase tracking-widest px-4 py-2 bg-black text-white hover:bg-neutral-800 transition-colors disabled:opacity-40"
                                        >
                                            {sending === order.id ? "Sending..." : "Send Reminder"}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
