"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
    { href: "/account/orders",    label: "Orders" },
    { href: "/account/profile",   label: "Profile" },
    { href: "/account/addresses", label: "Addresses" },
] as const;

export function AccountNav({ onSignOut }: { onSignOut: () => Promise<void> }) {
    const pathname = usePathname();

    return (
        <div className="flex gap-0 border-b border-neutral-200 mb-8 md:mb-12 overflow-x-auto">
            {NAV.map(({ href, label }) => {
                const active = pathname.startsWith(href);
                return (
                    <Link
                        key={href}
                        href={href}
                        className={`px-5 py-3 text-xs font-semibold uppercase tracking-widest border-b-2 -mb-px transition-colors whitespace-nowrap ${
                            active
                                ? "border-black text-black"
                                : "border-transparent text-neutral-400 hover:text-black"
                        }`}
                    >
                        {label}
                    </Link>
                );
            })}
            <form action={onSignOut} className="ml-auto">
                <button
                    type="submit"
                    className="px-5 py-3 text-xs uppercase tracking-widest text-neutral-400 hover:text-red-500 transition-colors whitespace-nowrap"
                >
                    Sign Out
                </button>
            </form>
        </div>
    );
}
