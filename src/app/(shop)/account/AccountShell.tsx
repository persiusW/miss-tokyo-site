"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
    User, ShoppingBag, Heart, Settings, ChevronRight, LogOut,
} from "lucide-react";

const TABS = [
    { key: "overview",  label: "Overview", href: "/account/overview",  Icon: User },
    { key: "orders",    label: "Orders",   href: "/account/orders",    Icon: ShoppingBag, countKey: "orders" as const },
    { key: "saved",     label: "Saved",    href: "/account/saved",     Icon: Heart,       countKey: "saved" as const },
    { key: "settings",  label: "Profile",  href: "/account/settings",  Icon: Settings },
] as const;

interface Props {
    userId: string;
    userEmail: string;
    children: React.ReactNode;
}

export function AccountShell({ userId, userEmail, children }: Props) {
    const pathname = usePathname();
    const router = useRouter();
    const [name, setName] = useState("");
    const [orderCount, setOrderCount] = useState(0);
    const [savedCount, setSavedCount] = useState(0);

    useEffect(() => {
        supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle()
            .then(({ data }: { data: any }) => { if (data?.full_name) setName(data.full_name); });

        supabase.from("orders").select("id", { count: "exact", head: true })
            .or(`customer_id.eq.${userId},customer_email.eq.${userEmail}`)
            .then(({ count }: { count: number | null }) => setOrderCount(count ?? 0));

        supabase.from("wishlists").select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .then(({ count, error }: { count: number | null; error: any }) => {
                if (!error) setSavedCount(count ?? 0);
            });
    }, [userId, userEmail]);

    const initial = (name || userEmail || "?")[0].toUpperCase();
    const displayName = name || userEmail.split("@")[0];

    const getCount = (key?: "orders" | "saved") => {
        if (key === "orders") return orderCount;
        if (key === "saved") return savedCount;
        return 0;
    };

    const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/");
    };

    return (
        <div className="acct-root flex-1 bg-[#f5f0e8]">

            {/* Mobile compact header */}
            <div className="md:hidden px-5 pt-5 pb-3 flex items-center gap-3 border-b border-[#e0d5c0]">
                <div className="w-10 h-10 rounded-full bg-[#1a1714] flex items-center justify-center shrink-0">
                    <span className="text-white font-serif text-base leading-none">{initial}</span>
                </div>
                <div className="min-w-0">
                    <p className="font-serif text-sm tracking-widest uppercase truncate leading-tight">{displayName}</p>
                    <p className="text-[11px] text-[#8c7e6a] truncate">{userEmail}</p>
                </div>
                <button onClick={handleSignOut} title="Sign out" className="ml-auto shrink-0 p-2 text-[#8c7e6a] hover:text-[#8b2f30] transition-colors">
                    <LogOut size={16} />
                </button>
            </div>

            {/* Mobile tab strip */}
            <nav className="md:hidden flex border-b border-[#e0d5c0] bg-[#fdf9f3]">
                {TABS.map((tab) => {
                    const { key, label, href } = tab;
                    const countKey = "countKey" in tab ? tab.countKey : undefined;
                    const active = isActive(href);
                    const count = countKey ? getCount(countKey) : 0;
                    return (
                        <Link
                            key={key}
                            href={href}
                            className={`flex-1 py-3 text-[10px] font-semibold uppercase tracking-widest border-b-2 -mb-px transition-colors flex items-center justify-center gap-1 ${
                                active
                                    ? "border-[#8b2f30] text-[#8b2f30]"
                                    : "border-transparent text-[#8c7e6a] hover:text-[#1a1714]"
                            }`}
                        >
                            {label}
                            {count > 0 && (
                                <span className={`text-[9px] px-1 py-0.5 rounded-full font-mono leading-none ${
                                    active ? "bg-[#8b2f30] text-white" : "bg-[#e0d5c0] text-[#4a3f33]"
                                }`}>
                                    {count}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Desktop layout: side rail + content */}
            <div className="md:flex md:max-w-6xl md:mx-auto md:px-8">

                {/* Side rail */}
                <aside className="hidden md:flex md:flex-col md:w-56 md:shrink-0 md:sticky md:top-20 md:h-[calc(100vh-5rem)] md:py-10 md:pr-8 md:border-r md:border-[#e0d5c0]">
                    {/* User identity */}
                    <div className="mb-8">
                        <div className="w-14 h-14 rounded-full bg-[#1a1714] flex items-center justify-center mb-4">
                            <span className="text-white font-serif text-xl leading-none">{initial}</span>
                        </div>
                        <p className="font-serif text-base tracking-widest uppercase leading-tight mb-0.5 truncate">{displayName}</p>
                        <p className="text-[11px] text-[#8c7e6a] truncate">{userEmail}</p>
                    </div>

                    {/* Nav */}
                    <nav className="flex flex-col gap-0.5 flex-1">
                        {TABS.map((tab) => {
                            const { key, label, href, Icon } = tab;
                            const countKey = "countKey" in tab ? tab.countKey : undefined;
                            const active = isActive(href);
                            const count = countKey ? getCount(countKey) : 0;
                            return (
                                <Link
                                    key={key}
                                    href={href}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                                        active
                                            ? "bg-[#8b2f30]/10 text-[#8b2f30] font-semibold"
                                            : "text-[#4a3f33] hover:bg-[#e0d5c0]/50 hover:text-[#1a1714]"
                                    }`}
                                >
                                    <Icon size={16} strokeWidth={active ? 2 : 1.5} className="shrink-0" />
                                    <span className="flex-1">{label}</span>
                                    {count > 0 && (
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${
                                            active ? "bg-[#8b2f30] text-white" : "bg-[#e0d5c0] text-[#4a3f33]"
                                        }`}>
                                            {count}
                                        </span>
                                    )}
                                    {!count && <ChevronRight size={12} className="opacity-30 shrink-0" />}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Sign out */}
                    <div className="mt-auto pt-6 border-t border-[#e0d5c0]">
                        <button
                            onClick={handleSignOut}
                            className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-[#8c7e6a] hover:text-[#8b2f30] transition-colors"
                        >
                            <LogOut size={14} /> Sign out
                        </button>
                    </div>
                </aside>

                {/* Content */}
                <main className="flex-1 px-5 md:px-10 py-8 md:py-10 min-w-0">
                    {children}
                </main>
            </div>
        </div>
    );
}
