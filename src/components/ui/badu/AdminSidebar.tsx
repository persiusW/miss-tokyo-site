"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/ui/badu/LogoutButton";

type NavItem = { label: string; href: string; badge?: string };

function NavLink({ href, label, badge }: NavItem) {
    const pathname = usePathname();
    const isActive =
        (href === "/overview" && pathname === "/overview") ||
        (href !== "/overview" && (pathname === href || pathname.startsWith(href + "/")));

    return (
        <Link
            href={href}
            className={`flex items-center justify-between px-3 py-[7px] text-sm transition-all duration-150 ${
                isActive
                    ? "bg-neutral-100 text-black font-semibold border-l-2 border-black"
                    : "text-neutral-500 hover:bg-neutral-50 hover:text-black border-l-2 border-transparent"
            }`}
            style={{ borderRadius: "0 6px 6px 0" }}
        >
            <span>{label}</span>
            {badge && (
                <span
                    className="text-[8px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: "#b8960c", color: "white" }}
                >
                    {badge}
                </span>
            )}
        </Link>
    );
}

function NavSection({ title, items }: { title: string; items: NavItem[] }) {
    return (
        <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-neutral-400 mb-1 px-3">
                {title}
            </p>
            <ul className="space-y-0.5">
                {items.map((item) => (
                    <li key={item.href}>
                        <NavLink {...item} />
                    </li>
                ))}
            </ul>
        </div>
    );
}

type Props = {
    isFullAccess: boolean;
    showCustomRequests: boolean;
    businessName: string;
};

export function AdminSidebar({ isFullAccess, showCustomRequests, businessName }: Props) {
    const [mobileOpen, setMobileOpen] = useState(false);

    const displayName = businessName || "Miss Tokyo";

    const salesItems: NavItem[] = [
        { label: "Orders", href: "/sales/orders" },
        { label: "Abandoned Carts", href: "/customers/abandoned" },
        { label: "Discounts", href: "/catalog/discounts" },
        { label: "Gift Cards", href: "/catalog/gift-cards" },
        ...(isFullAccess
            ? [
                  { label: "Pay Links", href: "/finance/links" },
                  { label: "Invoices", href: "/finance/invoices" },
              ]
            : []),
    ];

    const catalogueItems: NavItem[] = [
        { label: "Products", href: "/catalog/products" },
        { label: "Categories", href: "/catalog/categories" },
        ...(isFullAccess ? [{ label: "Wholesalers", href: "/sales/wholesalers" }] : []),
    ];

    const customerItems: NavItem[] = [
        { label: "Contact List", href: "/customers" },
        { label: "Form Submissions", href: "/customers/forms" },
        { label: "Riders", href: "/sales/riders" },
        ...(showCustomRequests
            ? [{ label: "Custom Requests", href: "/customers/requests" }]
            : []),
    ];

    const settingsItems: NavItem[] = isFullAccess
        ? [
              { label: "Site Settings", href: "/settings" },
              { label: "CMS", href: "/cms", badge: "New" },
          ]
        : [];

    const navContent = (
        <nav className="flex-1 py-5 px-2 space-y-5 overflow-y-auto">
            <NavSection
                title="Overview"
                items={[
                    { label: "Dashboard", href: "/overview" },
                    { label: "Analytics", href: "/sales/analytics" },
                ]}
            />
            <NavSection title="Sales" items={salesItems} />
            <NavSection title="Catalogue" items={catalogueItems} />
            <NavSection title="Customers" items={customerItems} />
            {settingsItems.length > 0 && (
                <NavSection title="Settings" items={settingsItems} />
            )}
        </nav>
    );

    const bottomStrip = (
        <div className="border-t border-neutral-100 px-2 py-3 space-y-1">
            <Link
                href="/"
                className="flex items-center px-3 py-2 text-xs text-neutral-400 hover:text-black rounded-lg hover:bg-neutral-50 transition-all duration-150"
            >
                ← Storefront
            </Link>
            <LogoutButton />
        </div>
    );

    return (
        <>
            {/* ── Desktop sidebar ── */}
            <aside className="w-[220px] shrink-0 border-r border-neutral-200 hidden md:flex flex-col h-screen sticky top-0 bg-white">
                <div className="px-4 py-6 border-b border-neutral-100">
                    <Link
                        href="/overview"
                        className="font-serif text-lg tracking-widest uppercase block text-neutral-900 leading-tight"
                    >
                        {displayName}
                    </Link>
                    <span className="text-[9px] uppercase tracking-widest text-neutral-400 mt-1.5 block">
                        Atelier Console
                    </span>
                </div>
                {navContent}
                {bottomStrip}
            </aside>

            {/* ── Mobile top bar ── */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-neutral-200 flex items-center justify-between px-4 h-14">
                <Link
                    href="/overview"
                    className="font-serif text-base tracking-widest uppercase text-neutral-900"
                >
                    {displayName}
                </Link>
                <button
                    onClick={() => setMobileOpen(true)}
                    aria-label="Open navigation"
                    className="p-2 text-neutral-600 hover:text-black transition-colors"
                >
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                    >
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="3" y1="12" x2="21" y2="12" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                    </svg>
                </button>
            </div>

            {/* ── Mobile overlay ── */}
            {mobileOpen && (
                <div
                    className="md:hidden fixed inset-0 z-40 bg-black/40"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* ── Mobile slide-in drawer ── */}
            <aside
                className={`md:hidden fixed top-0 left-0 z-50 h-full bg-white flex flex-col shadow-2xl transition-transform duration-200 w-[260px] ${
                    mobileOpen ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <div className="flex items-center justify-between px-4 h-14 border-b border-neutral-100 shrink-0">
                    <span className="font-serif text-base tracking-widest uppercase text-neutral-900">
                        {displayName}
                    </span>
                    <button
                        onClick={() => setMobileOpen(false)}
                        aria-label="Close navigation"
                        className="p-1.5 text-neutral-500 hover:text-black transition-colors"
                    >
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                        >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
                {navContent}
                {bottomStrip}
            </aside>
        </>
    );
}
