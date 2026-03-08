"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "@/lib/toast";

type Order = {
    id: string;
    customer_email: string;
    total_amount: number;
    status: string;
    paystack_reference: string | null;
    created_at: string;
};

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];

const STATUS_STYLES: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700",
    processing: "bg-blue-50 text-blue-700",
    shipped: "bg-purple-50 text-purple-700",
    delivered: "bg-green-50 text-green-700",
    cancelled: "bg-red-50 text-red-600",
    paid: "bg-green-50 text-green-700",
};

export default function OrderDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [sendingEmail, setSendingEmail] = useState(false);

    useEffect(() => {
        supabase
            .from("orders")
            .select("*")
            .eq("id", id)
            .single()
            .then(({ data }) => {
                if (data) setOrder(data);
                setLoading(false);
            });
    }, [id]);

    const updateStatus = async (newStatus: string) => {
        if (!order) return;
        setUpdating(true);
        const { error } = await supabase
            .from("orders")
            .update({ status: newStatus })
            .eq("id", order.id);

        if (error) {
            toast.error("Failed to update status.");
        } else {
            setOrder(prev => prev ? { ...prev, status: newStatus } : prev);
            toast.success(`Status updated to ${newStatus}.`);

            if (newStatus === "shipped") {
                setSendingEmail(true);
                try {
                    await fetch("/api/email/fulfillment", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ orderId: order.id }),
                    });
                    toast.success("Fulfillment email sent.");
                } catch {
                    toast.error("Could not send fulfillment email.");
                } finally {
                    setSendingEmail(false);
                }
            }
        }
        setUpdating(false);
    };

    const copyDetails = () => {
        if (!order) return;
        const text = [
            `Order: #${order.id.substring(0, 8).toUpperCase()}`,
            `Email: ${order.customer_email}`,
            `Amount: GH₵ ${Number(order.total_amount).toFixed(2)}`,
            `Reference: ${order.paystack_reference || "—"}`,
            `Date: ${new Date(order.created_at).toLocaleDateString()}`,
        ].join("\n");
        navigator.clipboard.writeText(text);
        toast.success("Customer details copied.");
    };

    if (loading) {
        return (
            <div className="space-y-8">
                <Link href="/sales/orders" className="text-xs uppercase tracking-widest text-neutral-500 hover:text-black">← Orders</Link>
                <p className="text-neutral-400 italic font-serif">Loading...</p>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="space-y-8">
                <Link href="/sales/orders" className="text-xs uppercase tracking-widest text-neutral-500 hover:text-black">← Orders</Link>
                <p className="text-neutral-500 italic font-serif">Order not found.</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 max-w-2xl">
            <div className="flex items-center justify-between">
                <Link href="/sales/orders" className="text-xs uppercase tracking-widest text-neutral-500 hover:text-black transition-colors">
                    ← Orders
                </Link>
                <button
                    onClick={copyDetails}
                    className="text-xs uppercase tracking-widest text-neutral-500 hover:text-black border-b border-neutral-300 hover:border-black transition-colors pb-0.5"
                >
                    Copy Customer Details
                </button>
            </div>

            <header>
                <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">Order</p>
                <h1 className="font-serif text-3xl tracking-widest uppercase">
                    #{order.id.substring(0, 8).toUpperCase()}
                </h1>
            </header>

            {/* Details card */}
            <div className="bg-white border border-neutral-200 divide-y divide-neutral-100">
                {[
                    ["Customer Email", order.customer_email],
                    ["Amount", `GH₵ ${Number(order.total_amount).toFixed(2)}`],
                    ["Paystack Ref", order.paystack_reference || "—"],
                    ["Date", new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })],
                ].map(([label, value]) => (
                    <div key={label} className="px-8 py-4 flex justify-between items-center text-sm">
                        <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400">{label}</span>
                        <span className="text-neutral-900 font-medium font-mono">{value}</span>
                    </div>
                ))}
            </div>

            {/* Status */}
            <div className="bg-white border border-neutral-200 p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xs uppercase tracking-widest font-semibold">Fulfillment Status</h2>
                    <span className={`px-3 py-1 text-[10px] uppercase tracking-widest font-semibold rounded ${STATUS_STYLES[order.status] || "bg-neutral-100 text-neutral-600"}`}>
                        {order.status}
                    </span>
                </div>

                <div className="flex flex-wrap gap-2">
                    {STATUSES.map(s => (
                        <button
                            key={s}
                            onClick={() => updateStatus(s)}
                            disabled={updating || order.status === s}
                            className={`px-4 py-2 text-[10px] uppercase tracking-widest font-semibold transition-colors ${
                                order.status === s
                                    ? "bg-black text-white cursor-default"
                                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                            } disabled:opacity-50`}
                        >
                            {s}
                        </button>
                    ))}
                </div>

                {order.status === "shipped" && (
                    <p className="text-[10px] uppercase tracking-widest text-green-700">
                        Fulfillment email {sendingEmail ? "sending..." : "sent to customer."}
                    </p>
                )}
            </div>
        </div>
    );
}
