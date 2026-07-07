"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/ui/miss-tokyo/LogoutButton";

// ─── Icons ────────────────────────────────────────────────────────────────────

const Ico = {
    Dashboard:  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>,
    Chart:      () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-7"/></svg>,
    POS:        () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 10h18M8 14h2"/></svg>,
    Orders:     () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4 6h16l-1.5 11a2 2 0 0 1-2 1.7H7.5a2 2 0 0 1-2-1.7L4 6Z"/><path d="M9 10v0M15 10v0"/></svg>,
    Doc:        () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z"/><path d="M14 3v6h6"/></svg>,
    Tag:        () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M20 12 12.5 4.5A2 2 0 0 0 11 4H5a1 1 0 0 0-1 1v6a2 2 0 0 0 .5 1.3L12 20l8-8Z"/><circle cx="8" cy="8" r="1"/></svg>,
    Sparkles:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6L12 4Z"/><path d="M19 16l.7 1.8L21.5 18l-1.8.7L19 20.5l-.7-1.8L16.5 18l1.8-.7L19 16Z"/></svg>,
    Gift:       () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="3" y="9" width="18" height="11" rx="1"/><path d="M3 13h18M12 9v11"/><path d="M8 9c0-3 4-3 4 0 0-3 4-3 4 0"/></svg>,
    Wallet:     () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="16" cy="14" r="1.2"/></svg>,
    Box:        () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>,
    Grid:       () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/></svg>,
    Users:      () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 20a5 5 0 0 1 5.5-5"/></svg>,
    Mail:       () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>,
    Truck:      () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="2" y="7" width="12" height="10" rx="1"/><path d="M14 10h4l3 3v4h-7"/><circle cx="7" cy="18.5" r="1.6"/><circle cx="17" cy="18.5" r="1.6"/></svg>,
    Cart:       () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 4h2l2.5 11a2 2 0 0 0 2 1.5h7.5a2 2 0 0 0 2-1.6L21 8H7"/><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/></svg>,
    Finance:    () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    Cog:        () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    Team:       () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
    Home:       () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/></svg>,
    Logout:     () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/><path d="M10 16l-4-4 4-4M6 12h11"/></svg>,
    ChevronLeft:  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>,
    ChevronRight: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>,
    // Panel-collapse controls: a sidebar panel with a chevron — reads as "collapse
    // the side panel", not "go back".
    PanelCollapse: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="m16 15-3-3 3-3"/></svg>,
    PanelExpand:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="m14 9 3 3-3 3"/></svg>,
};

// ─── Nav item ─────────────────────────────────────────────────────────────────

import type { ReactElement } from "react";
type NavItemDef = { label: string; href: string; Icon: () => ReactElement; badge?: string };

function NavItem({ label, href, Icon, badge, onClose, collapsed }: NavItemDef & { onClose: () => void; collapsed: boolean }) {
    const pathname = usePathname();
    const isActive =
        (href === "/overview" && pathname === "/overview") ||
        (href !== "/overview" && (pathname === href || pathname.startsWith(href + "/")));

    return (
        <Link
            href={href}
            className={`admin-nav-item${isActive ? " active" : ""}`}
            onClick={onClose}
            title={collapsed ? label : undefined}
        >
            <Icon />
            {!collapsed && <span className="admin-nav-label">{label}</span>}
            {!collapsed && badge && <span className="admin-nav-badge">{badge}</span>}
        </Link>
    );
}

function NavGroup({ title, items, onClose, collapsed }: { title: string; items: NavItemDef[]; onClose: () => void; collapsed: boolean }) {
    return (
        <div className="admin-nav-group">
            {!collapsed && <div className="admin-nav-title">{title}</div>}
            {items.map(item => <NavItem key={item.href} {...item} onClose={onClose} collapsed={collapsed} />)}
        </div>
    );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

type Props = {
    businessName: string;
    isFullAccess: boolean;
    showCustomRequests: boolean;
    mobileOpen: boolean;
    onClose: () => void;
    collapsed: boolean;
    onToggleCollapse: () => void;
};

export function AdminSidebar({ businessName, isFullAccess, showCustomRequests, mobileOpen, onClose, collapsed, onToggleCollapse }: Props) {
    const displayName = businessName || "Miss Tokyo";

    const overviewItems: NavItemDef[] = [
        { label: "Dashboard",  href: "/overview",        Icon: Ico.Dashboard },
        { label: "Analytics",  href: "/sales/analytics", Icon: Ico.Chart },
    ];

    const salesItems: NavItemDef[] = [
        { label: "Point of Sale",    href: "/pos",                Icon: Ico.POS },
        { label: "POS History",      href: "/pos/history",        Icon: Ico.Doc },
        { label: "Orders",           href: "/sales/orders",       Icon: Ico.Orders },
        { label: "Pre-Orders",       href: "/sales/pre-orders",   Icon: Ico.Box },
        { label: "Abandoned Carts",  href: "/customers/abandoned",Icon: Ico.Cart },
        { label: "Discounts",        href: "/catalog/discounts",  Icon: Ico.Tag },
        { label: "Auto Discounts",   href: "/catalog/auto-discounts", Icon: Ico.Sparkles },
        { label: "Gift Cards",       href: "/catalog/gift-cards", Icon: Ico.Gift },
        ...(isFullAccess ? [
            { label: "Pay Links",    href: "/finance/links",      Icon: Ico.Wallet },
            { label: "Invoices",     href: "/finance/invoices",   Icon: Ico.Doc },
        ] : []),
    ];

    const catalogueItems: NavItemDef[] = [
        { label: "Products",     href: "/catalog/products",    Icon: Ico.Box },
        { label: "Categories",   href: "/catalog/categories",  Icon: Ico.Grid },
        ...(isFullAccess ? [{ label: "Wholesalers", href: "/sales/wholesalers", Icon: Ico.Users }] : []),
    ];

    const customerItems: NavItemDef[] = [
        { label: "Contact List",   href: "/customers",          Icon: Ico.Users },
        { label: "Form Submissions", href: "/customers/forms",  Icon: Ico.Mail },
        { label: "Riders",         href: "/sales/riders",       Icon: Ico.Truck },
        ...(showCustomRequests ? [{ label: "Custom Requests", href: "/customers/requests", Icon: Ico.Sparkles }] : []),
    ];

    const settingsItems: NavItemDef[] = isFullAccess
        ? [
              { label: "Site Settings", href: "/settings", Icon: Ico.Cog },
              { label: "Team",          href: "/team",     Icon: Ico.Team },
          ]
        : [];

    return (
        <aside className={`admin-sidebar${mobileOpen ? " open" : ""}${collapsed ? " collapsed" : ""}`}>
            {/* Brand */}
            <div className="admin-brand">
                <div className="admin-brand-mark">
                    <span className="admin-brand-dot" />
                    {!collapsed && (
                        <Link href="/overview" className="admin-brand-name" onClick={onClose}>
                            {displayName}
                        </Link>
                    )}
                </div>
                {!collapsed && <div className="admin-brand-sub">Atelier Console</div>}
            </div>

            {/* Navigation */}
            <nav className="admin-nav">
                <NavGroup title="Overview"  items={overviewItems}  onClose={onClose} collapsed={collapsed} />
                <NavGroup title="Sales"     items={salesItems}     onClose={onClose} collapsed={collapsed} />
                <NavGroup title="Catalogue" items={catalogueItems} onClose={onClose} collapsed={collapsed} />
                <NavGroup title="Customers" items={customerItems}  onClose={onClose} collapsed={collapsed} />
                {settingsItems.length > 0 && (
                    <NavGroup title="Settings" items={settingsItems} onClose={onClose} collapsed={collapsed} />
                )}
            </nav>

            {/* Collapse toggle */}
            <button
                type="button"
                className="admin-sidebar-collapse-btn"
                onClick={onToggleCollapse}
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
                {collapsed ? <Ico.PanelExpand /> : <Ico.PanelCollapse />}
            </button>

            {/* Footer */}
            <div className="admin-sidebar-foot">
                <Link href="/" className="admin-foot-link" onClick={onClose} title={collapsed ? "Storefront" : undefined}>
                    <Ico.Home />
                    {!collapsed && <span className="admin-foot-label">Storefront</span>}
                </Link>
                <LogoutButton className="admin-foot-link" iconEl={<Ico.Logout />} />
            </div>
        </aside>
    );
}
