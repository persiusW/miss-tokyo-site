"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Check } from "lucide-react";

// ── Status timeline ───────────────────────────────────────────────────────────

const TIMELINE_STEPS = [
    { key: "ordered",    label: "Ordered" },
    { key: "processing", label: "Processing" },
    { key: "packed",     label: "Packed" },
    { key: "shipped",    label: "Shipped" },
    { key: "delivered",  label: "Delivered" },
] as const;

// Map DB status to which step index is active (0-based)
function statusToStep(status: string): number {
    switch (status) {
        case "pending":               return 0;
        case "paid":
        case "processing":            return 1;
        case "packed":                return 2;
        case "shipped":               return 3;
        case "delivered":
        case "fulfilled":             return 4;
        default:                      return 0;
    }
}

function isCancelled(status: string) {
    return status === "cancelled" || status === "refunded";
}

function StatusTimeline({ status }: { status: string }) {
    if (isCancelled(status)) {
        return (
            <div className="mt-4 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
                <span className="text-[10px] uppercase tracking-widest text-red-500 font-semibold">
                    {status === "refunded" ? "Refunded" : "Cancelled"}
                </span>
            </div>
        );
    }

    const active = statusToStep(status);

    return (
        <div className="mt-4 flex items-center gap-0 overflow-x-auto">
            {TIMELINE_STEPS.map((step, i) => {
                const done    = i < active;
                const current = i === active;
                const future  = i > active;

                return (
                    <div key={step.key} className="flex items-center min-w-0">
                        {/* Node */}
                        <div className="flex flex-col items-center shrink-0">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                                done    ? "bg-black border-black" :
                                current ? "bg-white border-black" :
                                          "bg-white border-neutral-300"
                            }`}>
                                {done ? (
                                    <Check size={11} className="text-white" strokeWidth={3} />
                                ) : current ? (
                                    <div className="w-2 h-2 rounded-full bg-black" />
                                ) : null}
                            </div>
                            <span className={`mt-1.5 text-[9px] uppercase tracking-wider whitespace-nowrap font-semibold ${
                                future ? "text-neutral-300" : "text-black"
                            }`}>
                                {step.label}
                            </span>
                        </div>

                        {/* Connector line (not after last) */}
                        {i < TIMELINE_STEPS.length - 1 && (
                            <div className={`h-[2px] w-8 md:w-14 shrink-0 mx-1 ${done ? "bg-black" : "bg-neutral-200"}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
    paid:        "bg-green-50 text-green-700",
    packed:      "bg-blue-50 text-blue-700",
    shipped:     "bg-indigo-50 text-indigo-700",
    processing:  "bg-blue-50 text-blue-700",
    pending:     "bg-amber-50 text-amber-700",
    fulfilled:   "bg-emerald-50 text-emerald-800",
    delivered:   "bg-emerald-100 text-emerald-800",
    cancelled:   "bg-red-50 text-red-600",
    refunded:    "bg-neutral-100 text-neutral-600",
};

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AccountOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [riders, setRiders] = useState<Record<string, Rider>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!user) return;

            const SELECT = "id, created_at, total_amount, status, assigned_rider_id, paystack_reference";

            // Fetch by customer_id (primary) AND customer_email (fallback for
            // orders placed before the account was linked), then merge & dedupe
            const [{ data: byId }, { data: byEmail }] = await Promise.all([
                supabase
                    .from("orders")
                    .select(SELECT)
                    .eq("customer_id", user.id)
                    .order("created_at", { ascending: false }),
                user.email
                    ? supabase
                        .from("orders")
                        .select(SELECT)
                        .eq("customer_email", user.email)
                        .order("created_at", { ascending: false })
                    : Promise.resolve({ data: [] }),
            ]);

            const seen = new Set<string>();
            const allOrders = [...(byId ?? []), ...(byEmail ?? [])]
                .filter(o => { if (seen.has(o.id)) return false; seen.add(o.id); return true; })
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
                                {/* Header row */}
                                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
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

                                {/* Status timeline */}
                                <StatusTimeline status={order.status} />

                                {/* Rider info (when shipped) */}
                                {isShipped && rider && (
                                    <div className="bg-indigo-50 border border-indigo-100 px-4 py-3 mt-4 text-xs">
                                        <p className="font-semibold uppercase tracking-widest text-indigo-700 mb-1">Dispatch Rider</p>
                                        <p className="text-indigo-600">{rider.full_name} · {rider.phone_number}</p>
                                    </div>
                                )}

                                {/* View details link */}
                                <div className="mt-4 flex justify-end">
                                    <Link
                                        href={`/account/orders/${order.id}`}
                                        className="text-[10px] uppercase tracking-widest font-semibold text-neutral-500 hover:text-black transition-colors border-b border-neutral-300 hover:border-black pb-0.5"
                                    >
                                        View Details →
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
