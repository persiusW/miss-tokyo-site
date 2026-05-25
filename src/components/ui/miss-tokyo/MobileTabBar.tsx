"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Film, Gift, User } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const TABS = [
    {
        href: "/shop",
        label: "Shop",
        Icon: ShoppingBag,
        matchPaths: ["/shop", "/products", "/search"],
    },
    {
        href: "/gallery",
        label: "Snaps",
        Icon: Film,
        matchPaths: ["/gallery"],
    },
    {
        href: "/gift-cards",
        label: "Gift Card",
        Icon: Gift,
        matchPaths: ["/gift-cards", "/gift-card"],
    },
    {
        href: "/account",
        label: "Account",
        Icon: User,
        matchPaths: ["/account", "/login"],
        authAware: true,
    },
] as const;

export function MobileTabBar() {
    const pathname = usePathname();
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        // Read current session on mount
        supabase.auth.getSession().then(({ data: { session } }: { data: { session: { user?: unknown } | null } }) => {
            setIsLoggedIn(!!session?.user);
        });

        // Keep in sync with auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: unknown, session: { user?: unknown } | null) => {
            setIsLoggedIn(!!session?.user);
        });
        return () => subscription.unsubscribe();
    }, []);

    return (
        <nav className="mobile-tab-bar" aria-label="Main navigation">
            {TABS.map((tab) => {
                const href = tab.href;
                const label = tab.label;
                const Icon = tab.Icon;
                const matchPaths = tab.matchPaths;
                const authAware = "authAware" in tab ? tab.authAware : false;
                // Account tab → redirect to /login when not signed in
                const resolvedHref = authAware && !isLoggedIn ? "/login" : href;
                const isActive = matchPaths.some((p) => pathname.startsWith(p));

                return (
                    <Link
                        key={href}
                        href={resolvedHref}
                        className={`tab-item${isActive ? " active" : ""}`}
                        aria-current={isActive ? "page" : undefined}
                    >
                        <span className="relative flex items-center justify-center">
                            {isActive && (
                                <span className="tab-active-dot" aria-hidden="true" />
                            )}
                            <Icon
                                size={22}
                                strokeWidth={isActive ? 2 : 1.5}
                                aria-hidden="true"
                            />
                        </span>
                        <span>{label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
