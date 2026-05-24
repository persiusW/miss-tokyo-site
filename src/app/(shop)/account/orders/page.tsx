"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Check } from "lucide-react";

// ── Status timeline ───────────────────────────────────────────────────────────

const DELIVERY_STEPS = [
    { key: "ordered",    label: "Ordered" },
    { key: "processing", label: "Processing" },
    { key: "packed",     label: "Packed" },
    { key: "shipped",    label: "Shipped" },
    { key: "delivered",  label: "Delivered" },
] as const;

const PICKUP_STEPS = [
    { key: "ordered",          label: "Ordered" },
    { key: "processing",       label: "Processing" },
    { key: "packed",           label: "Packed" },
    { key: "ready_for_pickup", label: "Ready" },
    { key: "collected",        label: "Collected" },
] as const;

function deliveryStatusToStep(status: string): number {
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

function pickupStatusToStep(status: string): number {
    switch (status) {
        case "pending":               return 0;
        case "paid":
        case "processing":            return 1;
        case "packed":                return 2;
        case "ready_for_pickup":      return 3;
        case "fulfilled":
        case "delivered":             return 4;
        default:                      return 0;
    }
}

function isCancelled(status: string) {
    return status === "cancelled" || status === "refunded";
}

function isPickupOrder(deliveryMethod: string | null) {
    return deliveryMethod?.toLowerCase().includes("pickup") ?? false;
}

function StatusTimeline({ status, deliveryMethod }: { status: string; deliveryMethod: string | null }) {
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

    const pickup = isPickupOrder(deliveryMethod);
    const steps = pickup ? PICKUP_STEPS : DELIVERY_STEPS;
    const active = pickup ? pickupStatusToStep(status) : deliveryStatusToStep(status);

    return (
        <div className="mt-4 flex items-center gap-0 overflow-x-auto">
            {steps.map((step, i) => {
                const done    = i < active;
                const current = i === active;
                const future  = i > active;

                return (
                    <div key={step.key} className="flex items-center min-w-0">
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
                        {i < steps.length - 1 && (
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
    paid:              "bg-green-50 text-green-700",
    packed:            "bg-blue-50 text-blue-700",
    shipped:           "bg-indigo-50 text-indigo-700",
    processing:        "bg-blue-50 text-blue-700",
    pending:           "bg-amber-50 text-amber-700",
    fulfilled:         "bg-emerald-50 text-emerald-800",
    delivered:         "bg-emerald-100 text-emerald-800",
    cancelled:         "bg-red-50 text-red-600",
    refunded:          "bg-neutral-100 text-neutral-600",
    ready_for_pickup:  "bg-neutral-900 text-white",
};

function statusLabel(status: string) {
    if (status === "ready_for_pickup") return "Ready for Pickup";
    return status;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Order = {
    id: string;
    created_at: string;
    total_amount: number | null;
    status: string;
    assigned_rider_id: string | null;
    paystack_reference: string | null;
    delivery_method: string | null;
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
    const [refreshing, setRefreshing] = useState(false);

    const fetchOrders = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser() as { data: any };
        if (!user) return;

        const SELECT = "id, created_at, total_amount, status, assigned_rider_id, paystack_reference, delivery_method";

        const [{ data: byId }, { data: byEmail }] = await Promise.all([
            supabase.from("orders").select(SELECT).eq("customer_id", user.id).order("created_at", { ascending: false }),
            user.email
                ? supabase.from("orders").select(SELECT).eq("customer_email", user.email).order("created_at", { ascending: false })
                : Promise.resolve({ data: [] }),
        ]);

        const seen = new Set<string>();
        const allOrders = [...(byId ?? []), ...(byEmail ?? [])]
            .filter(o => { if (seen.has(o.id)) return false; seen.add(o.id); return true; })
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setOrders(allOrders);

        const riderIds = [...new Set(allOrders.map(o => o.assigned_rider_id).filter(Boolean))] as string[];
        if (riderIds.length > 0) {
            const { data: riderData } = await supabase.from("riders").select("id, full_name, phone_number").in("id", riderIds);
            const map: Record<string, Rider> = {};
            (riderData ?? []).forEach((r: any) => { map[r.id] = r; });
            setRiders(map);
        }

        setLoading(false);
        setRefreshing(false);
    }, []);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    // Pull-to-refresh on mobile
    useEffect(() => {
        let startY = 0;
        const onTouchStart = (e: TouchEvent) => { startY = e.touches[0].clientY; };
        const onTouchEnd = (e: TouchEvent) => {
            const dy = e.changedTouches[0].clientY - startY;
            if (dy > 90 && window.scrollY === 0) {
                setRefreshing(true);
                fetchOrders();
            }
        };
        window.addEventListener("touchstart", onTouchStart, { passive: true });
        window.addEventListener("touchend", onTouchEnd, { passive: true });
        return () => {
            window.removeEventListener("touchstart", onTouchStart);
            window.removeEventListener("touchend", onTouchEnd);
        };
    }, [fetchOrders]);

    if (loading) return (
        <div className="space-y-4 animate-pulse max-w-2xl">
            {[1, 2, 3].map(i => (
                <div key={i} className="border border-[#e0d5c0] rounded-xl p-6 bg-[#fdf9f3]">
                    <div className="flex justify-between mb-4">
                        <div className="space-y-2">
                            <div className="h-3 w-28 bg-[#e0d5c0] rounded" />
                            <div className="h-3 w-20 bg-[#ede6d4] rounded" />
                        </div>
                        <div className="h-6 w-16 bg-[#e0d5c0] rounded-full" />
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                        {[1,2,3,4,5].map(j => <div key={j} className="h-6 w-6 rounded-full bg-[#e0d5c0]" />)}
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#8c7e6a] mb-1">Account</p>
                    <h1 className="font-serif text-2xl md:text-3xl tracking-widest uppercase">Orders <em className="italic">· archive</em></h1>
                </div>
                {refreshing && <span className="text-[10px] uppercase tracking-widest text-[#8c7e6a] animate-pulse">Refreshing…</span>}
            </div>

            {orders.length === 0 ? (
                <div className="text-center py-20">
                    <p className="text-3xl mb-4">🛍️</p>
                    <p className="font-serif text-[#8c7e6a] italic mb-8">No orders yet.</p>
                    <Link href="/shop" className="text-xs uppercase tracking-widest font-semibold border-b border-[#8b2f30] text-[#8b2f30] pb-0.5 hover:opacity-70 transition-opacity">
                        Browse Shop →
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map(order => {
                        const rider = order.assigned_rider_id ? riders[order.assigned_rider_id] : null;
                        const isShipped = order.status === "shipped" || order.status === "processing";
                        const isReadyPickup = order.status === "ready_for_pickup";
                        const pickup = isPickupOrder(order.delivery_method);

                        return (
                            <div key={order.id} className="border border-[#e0d5c0] bg-[#fdf9f3] rounded-xl p-5 md:p-6">
                                {/* Header row */}
                                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                                    <div>
                                        <p className="font-mono text-[10px] tracking-[0.15em] text-[#8c7e6a] uppercase mb-1">
                                            #{order.id.substring(0, 8).toUpperCase()}
                                        </p>
                                        <p className="text-xs text-[#8c7e6a]">
                                            {new Date(order.created_at).toLocaleDateString("en-GH", {
                                                year: "numeric", month: "long", day: "numeric",
                                            })}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`px-2 py-0.5 text-[10px] uppercase tracking-widest font-semibold rounded-full ${
                                            pickup ? "bg-[#1a1714] text-white" : "bg-[#e0d5c0] text-[#4a3f33]"
                                        }`}>
                                            {pickup ? "Pickup" : "Delivery"}
                                        </span>
                                        <span className="font-serif text-sm text-[#1a1714]">
                                            GH₵ {Number(order.total_amount ?? 0).toFixed(2)}
                                        </span>
                                        <span className={`px-2 py-0.5 text-[10px] uppercase tracking-widest rounded-full ${STATUS_STYLES[order.status] ?? "bg-neutral-100 text-neutral-600"}`}>
                                            {statusLabel(order.status)}
                                        </span>
                                    </div>
                                </div>

                                {/* Status timeline */}
                                <StatusTimeline status={order.status} deliveryMethod={order.delivery_method} />

                                {/* Ready for pickup callout */}
                                {isReadyPickup && (
                                    <div className="bg-[#1a1714] text-white px-4 py-3 mt-4 text-xs rounded-lg">
                                        <p className="font-semibold uppercase tracking-widest mb-1">Ready for Collection</p>
                                        <p className="text-[#c8bb98]">Your order is packed and waiting at our store. Please bring your order number when you arrive.</p>
                                    </div>
                                )}

                                {/* Rider info (when shipped) */}
                                {isShipped && rider && (
                                    <div className="bg-[#f0ede6] border border-[#e0d5c0] px-4 py-3 mt-4 text-xs rounded-lg">
                                        <p className="font-semibold uppercase tracking-widest text-[#4a3f33] mb-1">Dispatch Rider</p>
                                        <p className="text-[#8c7e6a]">{rider.full_name} · {rider.phone_number}</p>
                                    </div>
                                )}

                                {/* View details link */}
                                <div className="mt-4 flex justify-end">
                                    <Link
                                        href={`/account/orders/${order.id}`}
                                        className="text-[10px] uppercase tracking-widest font-semibold text-[#8b2f30] hover:underline transition-colors"
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
