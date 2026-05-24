"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ShoppingBag, Heart, MapPin, Settings, ChevronRight, Package } from "lucide-react";

type Order = { id: string; created_at: string; status: string; total_amount: number | null; delivery_method: string | null };

const STATUS_COLORS: Record<string, string> = {
    paid: "bg-emerald-50 text-emerald-700",
    processing: "bg-blue-50 text-blue-700",
    packed: "bg-blue-50 text-blue-700",
    shipped: "bg-indigo-50 text-indigo-700",
    delivered: "bg-emerald-50 text-emerald-800",
    fulfilled: "bg-emerald-50 text-emerald-800",
    cancelled: "bg-red-50 text-red-600",
    refunded: "bg-neutral-100 text-neutral-600",
    pending: "bg-amber-50 text-amber-700",
    ready_for_pickup: "bg-[#1a1714] text-white",
};

function statusLabel(s: string) {
    return s === "ready_for_pickup" ? "Ready for Pickup" : s.replace(/_/g, " ");
}

export default function OverviewPage() {
    const [loading, setLoading] = useState(true);
    const [orderCount, setOrderCount] = useState(0);
    const [savedCount, setSavedCount] = useState(0);
    const [latestOrder, setLatestOrder] = useState<Order | null>(null);

    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser() as any;
            if (!user) return;

            const [ocResult, scResult, loResult] = await Promise.all([
                supabase.from("orders").select("id", { count: "exact", head: true })
                    .or(`customer_id.eq.${user.id},customer_email.eq.${user.email ?? ""}`),
                supabase.from("wishlists").select("id", { count: "exact", head: true }).eq("user_id", user.id),
                supabase.from("orders")
                    .select("id, created_at, status, total_amount, delivery_method")
                    .or(`customer_id.eq.${user.id},customer_email.eq.${user.email ?? ""}`)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle(),
            ]);

            setOrderCount(ocResult.count ?? 0);
            setSavedCount(scResult.count ?? 0);
            setLatestOrder(loResult.data ?? null);
            setLoading(false);
        })();
    }, []);

    if (loading) return (
        <div className="space-y-6 animate-pulse">
            <div className="h-5 w-40 bg-[#e0d5c0] rounded" />
            <div className="grid grid-cols-3 gap-3">
                {[1,2,3].map(i => <div key={i} className="h-20 bg-[#e0d5c0] rounded-xl" />)}
            </div>
            <div className="h-28 bg-[#e0d5c0] rounded-xl" />
        </div>
    );

    const quickLinks = [
        { href: "/account/orders",    label: "Orders",     sub: `${orderCount} total`,    Icon: ShoppingBag },
        { href: "/account/saved",     label: "Saved",      sub: `${savedCount} pieces`,   Icon: Heart },
        { href: "/account/addresses", label: "Addresses",  sub: "Manage",                  Icon: MapPin },
        { href: "/account/settings",  label: "Settings",   sub: "Profile & preferences",  Icon: Settings },
    ];

    return (
        <div className="space-y-8 max-w-2xl">
            {/* Page title */}
            <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#8c7e6a] mb-1">Account</p>
                <h1 className="font-serif text-2xl md:text-3xl tracking-widest uppercase">
                    Overview
                </h1>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: "Orders", value: orderCount },
                    { label: "Saved",  value: savedCount },
                ].map(({ label, value }) => (
                    <div key={label} className="bg-[#fdf9f3] border border-[#e0d5c0] rounded-xl p-4 text-center">
                        <div className="font-serif text-3xl text-[#1a1714]">{value}</div>
                        <div className="text-[10px] uppercase tracking-widest text-[#8c7e6a] mt-1">{label}</div>
                    </div>
                ))}
                {/* Placeholder third cell — for future */}
                <div className="bg-[#fdf9f3] border border-[#e0d5c0] rounded-xl p-4 text-center opacity-40">
                    <div className="font-serif text-3xl text-[#1a1714]">—</div>
                    <div className="text-[10px] uppercase tracking-widest text-[#8c7e6a] mt-1">Rewards</div>
                </div>
            </div>

            {/* Latest order snapshot */}
            {latestOrder && (
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-serif text-base tracking-widest uppercase">
                            Latest <em>order</em>
                        </h2>
                        <Link href="/account/orders" className="text-[10px] uppercase tracking-widest text-[#8c7e6a] hover:text-[#8b2f30] transition-colors flex items-center gap-1">
                            All orders <ChevronRight size={11} />
                        </Link>
                    </div>
                    <div className="bg-[#fdf9f3] border border-[#e0d5c0] rounded-xl p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-[#1a1714]/5 flex items-center justify-center">
                                    <Package size={15} className="text-[#4a3f33]" />
                                </div>
                                <div>
                                    <p className="font-mono text-[10px] tracking-[0.15em] text-[#8c7e6a] uppercase">
                                        #{latestOrder.id.substring(0, 8).toUpperCase()}
                                    </p>
                                    <p className="text-xs text-[#4a3f33] mt-0.5">
                                        {new Date(latestOrder.created_at).toLocaleDateString("en-GH", { year: "numeric", month: "long", day: "numeric" })}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap justify-end">
                                <span className={`px-2 py-0.5 text-[10px] uppercase tracking-widest font-semibold rounded-sm ${STATUS_COLORS[latestOrder.status] ?? "bg-neutral-100 text-neutral-600"}`}>
                                    {statusLabel(latestOrder.status)}
                                </span>
                                {latestOrder.total_amount != null && (
                                    <span className="font-serif text-sm text-[#1a1714]">
                                        GH₵ {Number(latestOrder.total_amount).toFixed(2)}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <Link href={`/account/orders/${latestOrder.id}`} className="text-[10px] uppercase tracking-widest font-semibold text-[#8b2f30] hover:underline">
                                View details →
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick navigation */}
            <div>
                <h2 className="font-serif text-base tracking-widest uppercase mb-3">
                    Your <em>account</em>
                </h2>
                <div className="grid grid-cols-2 gap-3">
                    {quickLinks.map(({ href, label, sub, Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            className="bg-[#fdf9f3] border border-[#e0d5c0] rounded-xl p-4 flex items-center gap-3 hover:border-[#8b2f30]/40 hover:bg-white transition-colors group"
                        >
                            <span className="w-9 h-9 rounded-full bg-[#1a1714]/5 flex items-center justify-center shrink-0 group-hover:bg-[#8b2f30]/10 transition-colors">
                                <Icon size={16} className="text-[#4a3f33] group-hover:text-[#8b2f30] transition-colors" strokeWidth={1.5} />
                            </span>
                            <span className="min-w-0">
                                <span className="block text-xs font-semibold uppercase tracking-widest text-[#1a1714] truncate">{label}</span>
                                <span className="block text-[10px] text-[#8c7e6a] truncate">{sub}</span>
                            </span>
                            <ChevronRight size={13} className="ml-auto text-[#c8bb98] shrink-0" />
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
