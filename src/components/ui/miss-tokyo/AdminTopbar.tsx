"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { Theme } from "./AdminShellClient";
import CommandPalette from "./CommandPalette";

type Props = {
    user: { name: string; initials: string; role: string };
    onMenu: () => void;
    theme: Theme;
    onTheme: (t: Theme) => void;
};

function getCrumbs(pathname: string): string[] {
    const seg = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());

    if (pathname === "/overview") return ["Overview"];
    if (pathname.startsWith("/sales/analytics")) return ["Sales", "Analytics"];
    if (pathname.match(/^\/sales\/orders\/[^/]+$/)) return ["Sales", "Orders", "Order"];
    if (pathname.startsWith("/sales/orders")) return ["Sales", "Orders"];
    if (pathname.startsWith("/sales/pre-orders")) return ["Sales", "Pre-Orders"];
    if (pathname.startsWith("/sales/riders")) return ["Sales", "Riders"];
    if (pathname.startsWith("/sales/payments")) return ["Sales", "Payments"];
    if (pathname.startsWith("/sales/wholesalers")) return ["Sales", "Wholesalers"];
    if (pathname.startsWith("/pos/history")) return ["Sales", "POS History"];
    if (pathname.startsWith("/pos")) return ["Sales", "Point of Sale"];
    if (pathname.startsWith("/catalog/products/low-stock")) return ["Catalogue", "Products", "Low Stock"];
    if (pathname.startsWith("/catalog/products/new")) return ["Catalogue", "Products", "New"];
    if (pathname.match(/^\/catalog\/products\/[^/]+\/edit$/)) return ["Catalogue", "Products", "Edit"];
    if (pathname.startsWith("/catalog/products")) return ["Catalogue", "Products"];
    if (pathname.startsWith("/catalog/categories")) return ["Catalogue", "Categories"];
    if (pathname.startsWith("/catalog/discounts")) return ["Catalogue", "Discounts"];
    if (pathname.startsWith("/catalog/auto-discounts")) return ["Catalogue", "Auto Discounts"];
    if (pathname.startsWith("/catalog/gift-cards")) return ["Catalogue", "Gift Cards"];
    if (pathname.match(/^\/customers\/[^/]+$/) && !pathname.includes("abandoned") && !pathname.includes("forms") && !pathname.includes("requests")) return ["Customers", "Profile"];
    if (pathname.startsWith("/customers/abandoned")) return ["Customers", "Abandoned Carts"];
    if (pathname.startsWith("/customers/forms")) return ["Customers", "Forms"];
    if (pathname.startsWith("/customers/requests")) return ["Customers", "Custom Requests"];
    if (pathname.startsWith("/customers")) return ["Customers"];
    if (pathname.match(/^\/finance\/invoices\/[^/]+$/)) return ["Finance", "Invoices", "Detail"];
    if (pathname.startsWith("/finance/invoices")) return ["Finance", "Invoices"];
    if (pathname.startsWith("/finance/links")) return ["Finance", "Pay Links"];
    if (pathname.startsWith("/finance")) return ["Finance"];
    if (pathname.startsWith("/settings")) return ["Settings"];
    if (pathname.startsWith("/team")) return ["Settings", "Team"];
    if (pathname.startsWith("/communications")) return ["Communications", "Emails"];

    const parts = pathname.split("/").filter(Boolean);
    return parts.map(seg);
}

export function AdminTopbar({ user, onMenu, theme, onTheme }: Props) {
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [modKey, setModKey] = useState("⌘");

    // The badge has to match the keyboard the user actually has.
    useEffect(() => {
        const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
        setModKey(mac ? "⌘" : "Ctrl+");
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setPaletteOpen(o => !o);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const pathname = usePathname();
    const crumbs = getCrumbs(pathname);

    return (
        <div className="admin-topbar">
            {/* Hamburger — mobile only */}
            <button className="admin-hamburger" onClick={onMenu} aria-label="Open navigation">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <line x1="3" y1="7" x2="21" y2="7" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="17" x2="21" y2="17" />
                </svg>
            </button>

            {/* Breadcrumb */}
            <div className="admin-crumb">
                {crumbs.slice(0, -1).map((c, i) => (
                    <span key={i}>{c}<span className="sep"> / </span></span>
                ))}
                <span className="here">{crumbs[crumbs.length - 1]}</span>
            </div>

            <div className="admin-topbar-spacer" />

            {/* Global search — opens the ⌘K palette */}
            <button type="button" className="admin-search" onClick={() => setPaletteOpen(true)}
                style={{ cursor: "text", textAlign: "left" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
                </svg>
                <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: "var(--ac-ink-4)" }}>Search orders, products…</span>
                <kbd>{modKey}K</kbd>
            </button>
            <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

            {/* Theme toggle */}
            <div className="ac-theme-toggle">
                <button
                    type="button"
                    title="System theme"
                    className={`ac-theme-btn${theme === "system" ? " active" : ""}`}
                    onClick={() => onTheme("system")}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                    </svg>
                </button>
                <button
                    type="button"
                    title="Light theme"
                    className={`ac-theme-btn${theme === "light" ? " active" : ""}`}
                    onClick={() => onTheme("light")}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                        <circle cx="12" cy="12" r="4"/>
                        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
                    </svg>
                </button>
                <button
                    type="button"
                    title="Dark theme"
                    className={`ac-theme-btn${theme === "dark" ? " active" : ""}`}
                    onClick={() => onTheme("dark")}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                    </svg>
                </button>
            </div>

            {/* Bell */}
            <button className="admin-icon-btn" title="Notifications" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 8a6 6 0 1 1 12 0c0 6 2 7 2 7H4s2-1 2-7Z" />
                    <path d="M10 19a2 2 0 0 0 4 0" />
                </svg>
            </button>

            {/* User chip */}
            <div className="admin-user-chip">
                <div className="admin-user-avatar">{user.initials}</div>
                <div>
                    <div className="admin-user-name">{user.name}</div>
                    <div className="admin-user-role">{user.role}</div>
                </div>
            </div>
        </div>
    );
}
