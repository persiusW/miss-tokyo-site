"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Check, ShoppingBag, Heart, Settings, ChevronRight } from "lucide-react";
import { OrderNotificationsToggle } from "@/components/ui/miss-tokyo/OrderNotificationsToggle";

type OrderItem = { imageUrl?: string; quantity?: number; qty?: number };

type Order = {
    id: string;
    created_at: string;
    status: string;
    total_amount: number | null;
    delivery_method: string | null;
    items: OrderItem[] | null;
};

const ACTIVE_STATUSES = ["pending", "paid", "processing", "packed", "shipped", "ready_for_pickup"];

const STEP_LABELS = ["PLACED", "PREPARED", "DISPATCHED", "OUT", "DELIVERED"];

function statusToStep(status: string) {
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

function isCancelled(status: string) {
    return status === "cancelled" || status === "refunded";
}

function greeting(name: string) {
    const h = new Date().getHours();
    const time = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
    const first = name.trim().split(" ")[0];
    return `${time}, ${first}`;
}

function InMotionCard({ order }: { order: Order }) {
    const cancelled = isCancelled(order.status);
    const active = ACTIVE_STATUSES.includes(order.status);
    const step = statusToStep(order.status);
    const thumbs = (order.items ?? []).slice(0, 4).map(i => i.imageUrl).filter(Boolean) as string[];

    return (
        <div className="bg-[#fdf9f3] border border-[#e0d5c0] rounded-xl p-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                    <p className="font-mono text-[10px] tracking-[0.18em] text-[#8c7e6a] uppercase mb-0.5">
                        MT-{order.id.substring(0, 8).toUpperCase()}
                    </p>
                    <p className="text-[11px] text-[#8c7e6a]">
                        {new Date(order.created_at).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                </div>
                <span className={`px-2.5 py-1 text-[9px] uppercase tracking-widest font-semibold rounded-full flex items-center gap-1.5 ${
                    cancelled ? "bg-red-50 text-red-500" :
                    order.status === "delivered" || order.status === "fulfilled" ? "bg-emerald-50 text-emerald-700" :
                    "bg-[#1a1714]/8 text-[#4a3f33]"
                }`}>
                    {!cancelled && <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-[#8b2f30] animate-pulse" : "bg-emerald-500"}`} />}
                    {order.status === "shipped" ? "On the way" :
                     order.status === "ready_for_pickup" ? "Ready for pickup" :
                     order.status.replace(/_/g, " ")}
                </span>
            </div>

            {/* Thumbnails */}
            {thumbs.length > 0 && (
                <div className="flex gap-2 mb-4">
                    {thumbs.map((url, i) => (
                        <div key={i} className="w-14 h-14 rounded-lg bg-[#e8e0cc] overflow-hidden shrink-0">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                        </div>
                    ))}
                </div>
            )}

            {/* Progress bar */}
            {!cancelled && (
                <div className="flex items-center gap-0 mb-4 overflow-x-auto">
                    {STEP_LABELS.map((label, i) => {
                        const done = i < step;
                        const current = i === step;
                        return (
                            <div key={label} className="flex items-center">
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
                                        i > step ? "text-[#e0d5c0]" : "text-[#1a1714]"
                                    }`}>{label}</span>
                                </div>
                                {i < STEP_LABELS.length - 1 && (
                                    <div className={`h-[2px] w-5 md:w-8 shrink-0 mx-0.5 mb-3 ${done ? "bg-[#1a1714]" : "bg-[#e0d5c0]"}`} />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between">
                {order.total_amount != null && (
                    <span className="font-serif text-base text-[#1a1714]">
                        GH₵ {Number(order.total_amount).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                    </span>
                )}
                <Link
                    href={`/account/orders/${order.id}`}
                    className="ml-auto text-[10px] uppercase tracking-widest font-semibold px-4 py-2 border border-[#1a1714] text-[#1a1714] rounded hover:bg-[#1a1714] hover:text-white transition-colors"
                >
                    Order Details
                </Link>
            </div>
        </div>
    );
}

export default function OverviewPage() {
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState("");
    const [orderCount, setOrderCount] = useState(0);
    const [savedCount, setSavedCount] = useState(0);
    const [piecesCount, setPiecesCount] = useState(0);
    const [inMotionOrder, setInMotionOrder] = useState<Order | null>(null);
    const [lastOrder, setLastOrder] = useState<Order | null>(null);

    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser() as any;
            if (!user) return;

            const [profileRes, ocResult, scResult, ordersRes] = await Promise.all([
                supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
                supabase.from("orders").select("id", { count: "exact", head: true })
                    .or(`customer_id.eq.${user.id},customer_email.eq.${user.email ?? ""}`),
                supabase.from("wishlists").select("id", { count: "exact", head: true }).eq("user_id", user.id),
                supabase.from("orders")
                    .select("id, created_at, status, total_amount, delivery_method, items")
                    .or(`customer_id.eq.${user.id},customer_email.eq.${user.email ?? ""}`)
                    .order("created_at", { ascending: false })
                    .limit(10),
            ]);

            const name = (profileRes.data as any)?.full_name ?? user.email?.split("@")[0] ?? "";
            setUserName(name);
            setOrderCount(ocResult.count ?? 0);
            setSavedCount(scResult.count ?? 0);

            const orders: Order[] = ordersRes.data ?? [];

            // Sum pieces across all orders
            const pieces = orders.reduce((acc, o) => {
                return acc + (o.items ?? []).reduce((s: number, it: OrderItem) => s + (Number(it.quantity ?? it.qty ?? 1)), 0);
            }, 0);
            setPiecesCount(pieces);

            const active = orders.find(o => ACTIVE_STATUSES.includes(o.status));
            setInMotionOrder(active ?? null);
            setLastOrder(orders[0] ?? null);

            setLoading(false);
        })();
    }, []);

    if (loading) return (
        <div className="space-y-6 animate-pulse max-w-2xl">
            <div className="h-6 w-48 bg-[#e0d5c0] rounded" />
            <div className="grid grid-cols-3 gap-3">
                {[1,2,3].map(i => <div key={i} className="h-20 bg-[#e0d5c0] rounded-xl" />)}
            </div>
            <div className="h-44 bg-[#e0d5c0] rounded-xl" />
        </div>
    );

    const displayOrder = inMotionOrder ?? lastOrder;

    return (
        <div className="space-y-8 max-w-2xl">
            {/* Greeting */}
            <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#8c7e6a] mb-1">Account</p>
                <h1 className="font-serif text-2xl md:text-3xl tracking-widest uppercase">
                    {greeting(userName) || "Your account"}
                </h1>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: "Orders",  value: orderCount,  href: "/account/orders" },
                    { label: "Pieces",  value: piecesCount, href: "/account/orders" },
                    { label: "Saved",   value: savedCount,  href: "/account/saved"  },
                ].map(({ label, value, href }) => (
                    <Link key={label} href={href} className="bg-[#fdf9f3] border border-[#e0d5c0] rounded-xl p-4 text-center hover:border-[#8b2f30]/40 transition-colors group">
                        <div className="font-serif text-3xl text-[#1a1714]">{value}</div>
                        <div className="text-[10px] uppercase tracking-widest text-[#8c7e6a] mt-1 group-hover:text-[#8b2f30] transition-colors">{label}</div>
                    </Link>
                ))}
            </div>

            {/* In Motion */}
            {displayOrder && (
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-serif text-base tracking-widest uppercase">
                            {inMotionOrder ? "In motion" : "Your last order"}
                        </h2>
                        <Link href="/account/orders" className="text-[10px] uppercase tracking-widest text-[#8c7e6a] hover:text-[#8b2f30] transition-colors">
                            All orders →
                        </Link>
                    </div>
                    <InMotionCard order={displayOrder} />
                </div>
            )}

            {/* Quick navigation */}
            <div>
                <h2 className="font-serif text-base tracking-widest uppercase mb-3">
                    Your <em className="italic">account</em>
                </h2>
                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                        <OrderNotificationsToggle />
                    </div>
                    {[
                        { href: "/account/orders",   label: "Orders",  sub: `${orderCount} total`,   Icon: ShoppingBag },
                        { href: "/account/saved",    label: "Saved",   sub: `${savedCount} pieces`,  Icon: Heart },
                        { href: "/account/settings", label: "Profile", sub: "Profile & addresses",   Icon: Settings },
                    ].map(({ href, label, sub, Icon }) => (
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
