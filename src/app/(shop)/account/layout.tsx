"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const NAV = [
    { href: "/account/orders",    label: "Orders" },
    { href: "/account/profile",   label: "Profile" },
    { href: "/account/addresses", label: "Addresses" },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [email, setEmail] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) {
                router.replace(`/login?next=${pathname}`);
            } else {
                setEmail(user.email ?? null);
                setLoading(false);
            }
        });
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/");
    };

    if (loading) return null;

    return (
        <div className="pt-32 pb-32 px-6 md:px-12 max-w-5xl mx-auto">
            <header className="mb-12">
                <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">My Account</h1>
                {email && <p className="text-neutral-500 text-sm">{email}</p>}
            </header>

            <div className="flex gap-0 border-b border-neutral-200 mb-12 overflow-x-auto">
                {NAV.map(({ href, label }) => (
                    <Link
                        key={href}
                        href={href}
                        className={`px-6 py-3 text-xs font-semibold uppercase tracking-widest border-b-2 -mb-px transition-colors whitespace-nowrap ${
                            pathname === href ? "border-black text-black" : "border-transparent text-neutral-400 hover:text-black"
                        }`}
                    >
                        {label}
                    </Link>
                ))}
                <button
                    onClick={handleSignOut}
                    className="ml-auto px-6 py-3 text-xs uppercase tracking-widest text-neutral-400 hover:text-black transition-colors whitespace-nowrap"
                >
                    Sign Out
                </button>
            </div>

            {children}
        </div>
    );
}
