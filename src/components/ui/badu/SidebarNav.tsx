"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function NavLink({ href, label }: { href: string; label: string }) {
    const pathname = usePathname();
    const isActive =
        pathname === href ||
        (href !== "/overview" && pathname.startsWith(href + "/")) ||
        (href !== "/overview" && pathname === href);

    return (
        <Link
            href={href}
            className={`flex items-center px-4 py-2 rounded-lg text-sm transition-all duration-150 ${
                isActive
                    ? "bg-neutral-100 text-black font-semibold border-l-2 border-black pl-3.5"
                    : "text-neutral-500 hover:bg-neutral-50 hover:text-black"
            }`}
        >
            {label}
        </Link>
    );
}

export function SidebarNavSection({
    title,
    items,
}: {
    title: string;
    items: { label: string; href: string }[];
}) {
    return (
        <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-2 px-4">
                {title}
            </h3>
            <ul className="space-y-0.5">
                {items.map((item) => (
                    <li key={item.href}>
                        <NavLink href={item.href} label={item.label} />
                    </li>
                ))}
            </ul>
        </div>
    );
}
