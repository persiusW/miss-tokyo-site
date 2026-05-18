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
        <>
            <div className="ac-page-head">
                <div>
                    <h1 className="ac-page-h1">Abandoned Carts</h1>
                    <p className="ac-page-sub">Orders started but not completed (pending with no payment).</p>
                </div>
                <div className="ac-tabs">
                    {TIME_FILTERS.map(tf => (
                        <button
                            key={tf.key}
                            onClick={() => setTimeFilter(tf.key)}
                            className={`ac-tab ${timeFilter === tf.key ? "active" : ""}`}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="ac-card flush">
                <div className="ac-table-wrap">
                    <table className="ac-table">
                        <thead>
                            <tr>
                                <th>Customer</th>
                                <th>Email</th>
                                <th className="r">Cart Value</th>
                                <th>Items</th>
                                <th className="r">Date</th>
                                <th className="r"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="ac-table-empty">Loading...</td></tr>
                            ) : orders.length === 0 ? (
                                <tr><td colSpan={6} className="ac-table-empty">No abandoned carts in this period.</td></tr>
                            ) : orders.map(order => (
                                <tr key={order.id}>
                                    <td style={{ fontWeight: 500, color: "var(--ac-ink)" }}>
                                        {order.customer_name || <span style={{ color: "var(--ac-ink-4)", fontStyle: "italic" }}>Unknown</span>}
                                    </td>
                                    <td style={{ fontSize: 12, color: "var(--ac-ink-3)" }}>
                                        {order.customer_email || "—"}
                                    </td>
                                    <td className="r" style={{ fontFamily: "var(--f-mono)", fontSize: 12, fontWeight: 500 }}>
                                        GH₵ {Number(order.total_amount ?? 0).toFixed(2)}
                                    </td>
                                    <td style={{ fontSize: 12, color: "var(--ac-ink-4)" }}>{itemCount(order.items)}</td>
                                    <td className="r" style={{ fontSize: 11, color: "var(--ac-ink-4)" }}>
                                        {new Date(order.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="r">
                                        {remindedIds.has(order.id) ? (
                                            <span className="ac-badge ac-badge-ok">Sent</span>
                                        ) : (
                                            <button
                                                onClick={() => handleRemind(order)}
                                                disabled={sending === order.id || !order.customer_email}
                                                className="ac-btn ac-btn-primary ac-btn-sm"
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
        </>
    );
}
