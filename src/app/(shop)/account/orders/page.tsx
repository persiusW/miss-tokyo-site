"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Check } from "lucide-react";

// ── Steps ─────────────────────────────────────────────────────────────────────

const DELIVERY_STEPS = [
    { key: "ordered",    label: "Placed" },
    { key: "processing", label: "Prepared" },
    { key: "packed",     label: "Dispatched" },
    { key: "shipped",    label: "Out" },
    { key: "delivered",  label: "Delivered" },
] as const;

const PICKUP_STEPS = [
    { key: "ordered",          label: "Placed" },
    { key: "processing",       label: "Prepared" },
    { key: "packed",           label: "Packed" },
    { key: "ready_for_pickup", label: "Ready" },
    { key: "collected",        label: "Collected" },
] as const;

function deliveryStatusToStep(status: string): number {
    switch (status) {
        case "pending": return 0;
        case "paid":
        case "processing": return 1;
        case "packed": return 2;
        case "shipped": return 3;
        case "delivered":
        case "fulfilled": return 4;
        default: return 0;
    }
}

function pickupStatusToStep(status: string): number {
    switch (status) {
        case "pending": return 0;
        case "paid":
        case "processing": return 1;
        case "packed": return 2;
        case "ready_for_pickup": return 3;
        case "fulfilled":
        case "delivered": return 4;
        default: return 0;
    }
}

function isCancelled(s: string) { return s === "cancelled" || s === "refunded"; }
function isPickupOrder(m: string | null) { return m?.toLowerCase().includes("pickup") ?? false; }
function isOnTheWay(s: string) { return ["paid", "processing", "packed", "shipped", "pending", "ready_for_pickup"].includes(s); }
function isDelivered(s: string) { return s === "delivered" || s === "fulfilled"; }

// ── Types ─────────────────────────────────────────────────────────────────────

type OrderItem = { imageUrl?: string; image_url?: string; name?: string; quantity?: number; qty?: number };

type Order = {
    id: string;
    created_at: string;
    total_amount: number | null;
    status: string;
    assigned_rider_id: string | null;
    paystack_reference: string | null;
    delivery_method: string | null;
    items: OrderItem[] | null;
};

type Rider = { full_name: string; phone_number: string };

// ── Status timeline ───────────────────────────────────────────────────────────

function StatusTimeline({ status, deliveryMethod }: { status: string; deliveryMethod: string | null }) {
    if (isCancelled(status)) {
        return (
            <div className="flex items-center gap-2 mt-3">
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
        <div className="flex items-center gap-0 mt-3 overflow-x-auto pb-1">
            {steps.map((step, i) => {
                const done    = i < active;
                const current = i === active;
                return (
                    <div key={step.key} className="flex items-center">
                        <div className="flex flex-col items-center shrink-0">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${
                                done ? "bg-[#1a1714] border-[#1a1714]" :
                                current ? "bg-white border-[#1a1714]" :
                                "bg-white border-[#e0d5c0]"
                            }`}>
                                {done ? <Check size={9} className="text-white" strokeWidth={3} /> :
                                 current ? <div className="w-1.5 h-1.5 rounded-full bg-[#1a1714]" /> : null}
                            </div>
                            <span className={`mt-1 text-[8px] uppercase tracking-wider whitespace-nowrap font-semibold ${
                                i > active ? "text-[#e0d5c0]" : "text-[#1a1714]"
                            }`}>{step.label}</span>
                        </div>
                        {i < steps.length - 1 && (
                            <div className={`h-[2px] w-6 md:w-10 shrink-0 mx-0.5 mb-3 ${done ? "bg-[#1a1714]" : "bg-[#e0d5c0]"}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ── Filter tabs ───────────────────────────────────────────────────────────────

type Filter = "all" | "on-the-way" | "delivered" | "returns";

const FILTERS: { key: Filter; label: string }[] = [
    { key: "all",        label: "ALL" },
    { key: "on-the-way", label: "ON THE WAY" },
    { key: "delivered",  label: "DELIVERED" },
    { key: "returns",    label: "RETURNS" },
];

function filterOrders(orders: Order[], filter: Filter): Order[] {
    if (filter === "on-the-way") return orders.filter(o => isOnTheWay(o.status));
    if (filter === "delivered")  return orders.filter(o => isDelivered(o.status));
    if (filter === "returns")    return orders.filter(o => isCancelled(o.status));
    return orders;
}

function filterCount(orders: Order[], filter: Filter) {
    return filterOrders(orders, filter).length;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AccountOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [riders, setRiders] = useState<Record<string, Rider>>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<Filter>("all");

    const fetchOrders = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser() as { data: any };
        if (!user) return;

        const SELECT = "id, created_at, total_amount, status, assigned_rider_id, paystack_reference, delivery_method, items";

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

    useEffect(() => {
        let startY = 0;
        const onTouchStart = (e: TouchEvent) => { startY = e.touches[0].clientY; };
        const onTouchEnd = (e: TouchEvent) => {
            const dy = e.changedTouches[0].clientY - startY;
            if (dy > 90 && window.scrollY === 0) { setRefreshing(true); fetchOrders(); }
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
            <div className="flex gap-2 mb-6">
                {[1,2,3,4].map(i => <div key={i} className="h-8 w-24 bg-[#e0d5c0] rounded-full" />)}
            </div>
            {[1, 2, 3].map(i => (
                <div key={i} className="border border-[#e0d5c0] rounded-xl p-6 bg-[#fdf9f3] space-y-4">
                    <div className="flex justify-between">
                        <div className="h-3 w-28 bg-[#e0d5c0] rounded" />
                        <div className="h-6 w-20 bg-[#e0d5c0] rounded-full" />
                    </div>
                    <div className="flex gap-2">
                        {[1,2,3].map(j => <div key={j} className="w-[70px] h-[70px] rounded-lg bg-[#e0d5c0]" />)}
                    </div>
                </div>
            ))}
        </div>
    );

    const visible = filterOrders(orders, filter);

    return (
        <div className="max-w-2xl">
            {/* Pull-to-refresh indicator */}
            {refreshing && (
                <div className="flex items-center justify-center gap-2 py-3 mb-2 -mt-2">
                    <svg className="w-4 h-4 animate-spin text-[#8b2f30]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
                    </svg>
                    <span className="text-[10px] uppercase tracking-widest text-[#8c7e6a]">Refreshing</span>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#8c7e6a] mb-1">Account</p>
                    <h1 className="font-serif text-2xl md:text-3xl tracking-widest uppercase">
                        Orders <em className="italic">· archive</em>
                    </h1>
                    <p className="text-sm text-[#8c7e6a] mt-1">Track shipments. Re-order favourites. Download invoices.</p>
                </div>
            </div>

            {/* Filter tabs */}
            {orders.length > 0 && (
                <div className="flex gap-2 overflow-x-auto scrollbar-none mb-6 pb-1">
                    {FILTERS.map(({ key, label }) => {
                        const count = filterCount(orders, key);
                        const active = filter === key;
                        return (
                            <button
                                key={key}
                                onClick={() => setFilter(key)}
                                className={`flex-none flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-semibold uppercase tracking-widest transition-colors border whitespace-nowrap ${
                                    active
                                        ? "bg-[#1a1714] text-white border-[#1a1714]"
                                        : "bg-transparent text-[#4a3f33] border-[#e0d5c0] hover:border-[#1a1714]"
                                }`}
                            >
                                {label}
                                <span className={`text-[9px] font-mono ${active ? "text-[#c8bb98]" : "text-[#8c7e6a]"}`}>{count}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {orders.length === 0 ? (
                <div className="text-center py-20">
                    <p className="text-3xl mb-4">🛍️</p>
                    <p className="font-serif text-[#8c7e6a] italic mb-8">No orders yet.</p>
                    <Link href="/shop" className="text-xs uppercase tracking-widest font-semibold border-b border-[#8b2f30] text-[#8b2f30] pb-0.5 hover:opacity-70 transition-opacity">
                        Browse Shop →
                    </Link>
                </div>
            ) : visible.length === 0 ? (
                <div className="text-center py-16">
                    <p className="font-serif text-[#8c7e6a] italic">No orders in this category.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {visible.map(order => {
                        const rider = order.assigned_rider_id ? riders[order.assigned_rider_id] : null;
                        const pickup = isPickupOrder(order.delivery_method);
                        const delivered = isDelivered(order.status);
                        const cancelled = isCancelled(order.status);
                        const thumbs = (order.items ?? []).slice(0, 4).map(i => i.imageUrl || i.image_url).filter(Boolean) as string[];

                        return (
                            <div key={order.id} className="border border-[#e0d5c0] bg-[#fdf9f3] rounded-xl p-5 md:p-6">
                                {/* Header */}
                                <div className="flex items-start justify-between gap-3 pb-4 border-b border-dashed border-[#e0d5c0]">
                                    <div>
                                        <p className="font-mono text-[11px] tracking-[0.15em] text-[#4a3f33] font-semibold">
                                            MT-{order.id.substring(0, 8).toUpperCase()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2.5 py-1 text-[9px] uppercase tracking-widest font-semibold rounded-full flex items-center gap-1.5 ${
                                            cancelled ? "bg-red-50 text-red-500" :
                                            delivered ? "bg-emerald-50 text-emerald-700" :
                                            "bg-[#e8e0cc] text-[#4a3f33]"
                                        }`}>
                                            {!cancelled && !delivered && <span className="w-1.5 h-1.5 rounded-full bg-[#8b2f30] animate-pulse" />}
                                            {order.status === "shipped" ? "On the way" :
                                             order.status === "ready_for_pickup" ? "Ready for pickup" :
                                             order.status.replace(/_/g, " ")}
                                        </span>
                                        <span className="text-[10px] text-[#8c7e6a]">
                                            {new Date(order.created_at).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                                        </span>
                                    </div>
                                </div>

                                {/* Product thumbnails */}
                                {thumbs.length > 0 && (
                                    <div className="flex gap-2 mt-4">
                                        {thumbs.map((url, i) => (
                                            <div key={i} className="w-[70px] h-[70px] rounded-lg bg-[#e8e0cc] overflow-hidden shrink-0">
                                                <img src={url} alt="" className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Status timeline */}
                                <StatusTimeline status={order.status} deliveryMethod={order.delivery_method} />

                                {/* Ready for pickup callout */}
                                {order.status === "ready_for_pickup" && (
                                    <div className="bg-[#1a1714] text-white px-4 py-3 mt-3 text-xs rounded-lg">
                                        <p className="font-semibold uppercase tracking-widest mb-1">Ready for Collection</p>
                                        <p className="text-[#c8bb98]">Your order is packed and waiting at our store.</p>
                                    </div>
                                )}

                                {/* Rider info */}
                                {order.status === "shipped" && rider && (
                                    <div className="bg-[#f0ede6] border border-[#e0d5c0] px-4 py-3 mt-3 text-xs rounded-lg">
                                        <p className="font-semibold uppercase tracking-widest text-[#4a3f33] mb-1">Dispatch Rider</p>
                                        <p className="text-[#8c7e6a]">{rider.full_name} · {rider.phone_number}</p>
                                    </div>
                                )}

                                {/* Footer */}
                                <div className="mt-4 flex items-center justify-between gap-3">
                                    <span className="font-serif text-base text-[#1a1714]">
                                        GH₵ {Number(order.total_amount ?? 0).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                                    </span>
                                    <div className="flex gap-2">
                                        {delivered && (
                                            <Link
                                                href="/shop"
                                                className="text-[10px] uppercase tracking-widest font-semibold px-4 py-2 border border-[#e0d5c0] text-[#4a3f33] rounded hover:border-[#1a1714] transition-colors"
                                            >
                                                Re-order
                                            </Link>
                                        )}
                                        <Link
                                            href={`/account/orders/${order.id}`}
                                            className="text-[10px] uppercase tracking-widest font-semibold px-4 py-2 border border-[#1a1714] text-[#1a1714] rounded hover:bg-[#1a1714] hover:text-white transition-colors"
                                        >
                                            Details
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
