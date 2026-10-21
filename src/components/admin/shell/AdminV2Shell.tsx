"use client";

// Admin v2 shell: one side navigation, a sticky top bar with ⌘K search and the
// user menu, and the Settings leave-without-saving guard.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MissTokyoAi, MissTokyoAiProvider } from "@/components/admin/missTokyoAi/MissTokyoAi";
import { AiBell } from "@/components/admin/missTokyoAi/AiBell";
import { Icon } from "@/components/admin/ui/Icon";
import { Btn, IconBtn } from "@/components/admin/ui/primitives";
import { Menu, Modal } from "@/components/admin/ui/overlays";
import { initials, plural } from "@/components/admin/ui/format";
import { ToasterV2 } from "@/components/admin/ui/Toaster";
import { beginThemeFade, signalRouteCommit, startRouteTransition } from "@/components/admin/ui/motion";
import { createClient } from "@/lib/supabaseBrowser";
import { AdminV2Context, type AdminV2Ctx, type V2Role } from "./AdminV2Context";
import { CommandPaletteV2 } from "./CommandPaletteV2";
import { NAV_GENERAL, NAV_MAIN, ROLE_LABEL, navActive, pageKey, type NavDef } from "./nav";

type Theme = "light" | "dark" | "system";

type Props = {
    children: ReactNode;
    businessName: string;
    role: V2Role;
    user: { name: string; email: string | null };
    showCustomRequests: boolean;
    /** True when only this device is previewing (the store switch is still off). */
    previewOnly: boolean;
    fontClass: string;
};

export function AdminV2Shell({ children, businessName, role, user, showCustomRequests, previewOnly, fontClass }: Props) {
    const pathname = usePathname() || "/";
    const router = useRouter();
    const [navOpen, setNavOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [theme, setTheme] = useState<Theme>("system");
    const [pal, setPal] = useState(false);
    const [dirty, setDirty] = useState(0);
    const [pending, setPending] = useState<string | null>(null);
    const [counts, setCounts] = useState<{ inbox: number; orders: number }>({ inbox: 0, orders: 0 });
    const discardRef = useRef<(() => void) | null>(null);
    const full = role !== "sales_staff";

    useEffect(() => {
        const t = localStorage.getItem("ac-theme");
        if (t === "light" || t === "dark" || t === "system") setTheme(t);
        setCollapsed(localStorage.getItem("ac-sidebar-collapsed") === "true");
        // Settings › Your account › Appearance (and other tabs) change it too.
        const s = (e: StorageEvent) => {
            if (e.key === "ac-theme" && (e.newValue === "light" || e.newValue === "dark" || e.newValue === "system")) { beginThemeFade(); setTheme(e.newValue); }
        };
        window.addEventListener("storage", s);
        // "Match this device" follows the OS; cross-fade that switch too.
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const os = () => { const t = localStorage.getItem("ac-theme"); if (!t || t === "system") beginThemeFade(); };
        mq.addEventListener("change", os);
        return () => { window.removeEventListener("storage", s); mq.removeEventListener("change", os); };
    }, []);
    const pickTheme = (t: Theme) => { beginThemeFade(); setTheme(t); localStorage.setItem("ac-theme", t); };
    const toggleRail = () => setCollapsed(c => { localStorage.setItem("ac-sidebar-collapsed", String(!c)); return !c; });

    // ⌘K / Ctrl+K. Extensions dispatch synthetic key events with no key at all.
    useEffect(() => {
        const k = (e: KeyboardEvent) => {
            if (typeof e.key !== "string") return;
            if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setPal(p => !p); }
        };
        window.addEventListener("keydown", k);
        return () => window.removeEventListener("keydown", k);
    }, []);

    // Unsaved settings survive neither a reload nor a closed tab without asking.
    useEffect(() => {
        if (dirty <= 0) return;
        const b = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
        window.addEventListener("beforeunload", b);
        return () => window.removeEventListener("beforeunload", b);
    }, [dirty]);

    // Nav counts: on load, every minute while visible, on focus, and when an
    // order is inserted or changes.
    const refreshCounts = useCallback(async () => {
        try {
            const r = await fetch("/api/admin/v2/nav-counts", { cache: "no-store" });
            if (!r.ok) return;
            const d = await r.json();
            setCounts({ inbox: Number(d.inbox) || 0, orders: Number(d.orders) || 0 });
        } catch { /* keep the last counts */ }
    }, []);
    useEffect(() => {
        void refreshCounts();
        const t = setInterval(() => { if (document.visibilityState === "visible") void refreshCounts(); }, 60_000);
        const f = () => void refreshCounts();
        window.addEventListener("focus", f);
        let ch: { unsubscribe: () => void } | null = null;
        try {
            const sb = createClient();
            let timer: ReturnType<typeof setTimeout> | null = null;
            const soon = () => { if (timer) clearTimeout(timer); timer = setTimeout(() => void refreshCounts(), 800); };
            ch = sb.channel("adm2-nav-orders")
                .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, soon)
                .subscribe();
        } catch { /* realtime is a nicety; polling still runs */ }
        return () => { clearInterval(t); window.removeEventListener("focus", f); ch?.unsubscribe(); };
    }, [refreshCounts]);

    const go = useCallback((href: string) => {
        const leavingSettings = pathname.startsWith("/settings") && !href.startsWith("/settings");
        if (dirty > 0 && leavingSettings) { setPending(href); return; }
        startRouteTransition(href);
        router.push(href);
    }, [dirty, pathname, router]);

    // A route view transition waits for the new page; this is its cue.
    useLayoutEffect(() => { signalRouteCommit(); }, [pathname]);

    const ctx: AdminV2Ctx = useMemo(() => ({
        role, userName: user.name, isFullAccess: full, isAdmin: role === "admin", showCustomRequests,
        dirty, setDirty, setDiscard: fn => { discardRef.current = fn; }, go, refreshCounts: () => void refreshCounts(),
    }), [role, user.name, full, showCustomRequests, dirty, go, refreshCounts]);

    const signOut = async () => {
        try { await createClient().auth.signOut(); } catch { /* still leave */ }
        window.location.href = "/admin/login";
    };
    const leavePreview = async () => {
        await fetch("/api/admin/v2/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ on: false }) }).catch(() => null);
        window.location.href = "/overview";
    };

    const navItem = (n: NavDef) => {
        if (n.full && !full) return null;
        const active = navActive(n, pathname);
        const count = n.k === "inbox" ? counts.inbox : n.k === "orders" ? counts.orders : 0;
        return (
            <Link key={n.k} href={n.href} className="nav-item" aria-current={active ? "page" : undefined} title={collapsed ? n.label : undefined}
                onClick={e => {
                    setNavOpen(false);
                    if (dirty > 0 && pathname.startsWith("/settings") && !n.href.startsWith("/settings")) { e.preventDefault(); setPending(n.href); }
                }}
                onNavigate={() => startRouteTransition(n.href)}>
                <Icon n={n.icon} />
                <span>{n.label}</span>
                {n.k === "settings" && dirty > 0
                    ? <span className="nav-dot" aria-label="Unsaved changes" />
                    : count > 0 ? <span className="nav-count" aria-label={`${count} need attention`}>{count > 99 ? "99+" : count}</span> : null}
            </Link>
        );
    };

    const themeAttr = theme === "system" ? undefined : theme;
    const nav = [...NAV_MAIN, ...NAV_GENERAL].filter(n => !n.full || full);

    return (
        <MissTokyoAiProvider user={{ name: user.name, role }}>
            <AdminV2Context.Provider value={ctx}>
                <div className={`adm2 ${fontClass}`} {...(themeAttr ? { "data-theme": themeAttr } : {})}>
                    <a href="#main" className="skip">Skip to content</a>
                    <div className={`app${collapsed ? " collapsed" : ""}`}>
                        <div className={`scrim-nav${navOpen ? " on" : ""}`} onClick={() => setNavOpen(false)} aria-hidden="true" />
                        <nav className={`side${navOpen ? " open" : ""}`} aria-label="Main">
                            <div className="brand">
                                <div className="brand-mark" aria-hidden="true">{(businessName || "M").trim()[0]?.toUpperCase()}</div>
                                <div><div className="brand-name">{businessName}</div><div className="brand-sub">Store admin</div></div>
                            </div>
                            <div className="nav-group">{NAV_MAIN.map(navItem)}</div>
                            {full && <div className="nav-group"><div className="nav-title">General</div>{NAV_GENERAL.map(navItem)}</div>}
                            <div className="side-foot">
                                <a className="nav-item" href="/" target="_blank" rel="noopener noreferrer" title={collapsed ? "View store" : undefined}>
                                    <Icon n="store" /><span>View store</span>
                                </a>
                                <button type="button" className="nav-item hide-sm" onClick={toggleRail} aria-pressed={collapsed}
                                    title={collapsed ? "Expand the menu" : undefined}>
                                    <Icon n="rail" /><span>{collapsed ? "Expand the menu" : "Collapse the menu"}</span>
                                </button>
                            </div>
                        </nav>
                        <div className="main">
                            <div className="top">
                                <span className="hamburger"><IconBtn label="Open navigation" icon="menu" onClick={() => setNavOpen(true)} /></span>
                                <button type="button" className="top-search" data-assist="topbar.search" onClick={() => setPal(true)} aria-label="Search orders, products and customers">
                                    <Icon n="search" /><span className="lbl grow">Search orders, products, customers</span><span className="kbd">⌘K</span>
                                </button>
                                <div className="grow" />
                                <AiBell />
                                <Menu label="Your account" items={[
                                    { l: "Your account", icon: "user", onClick: () => go("/settings/account") },
                                    "-",
                                    { l: theme === "light" ? "✓ Light theme" : "Light theme", icon: "sun", onClick: () => pickTheme("light") },
                                    { l: theme === "dark" ? "✓ Dark theme" : "Dark theme", icon: "moon", onClick: () => pickTheme("dark") },
                                    { l: theme === "system" ? "✓ Match this device" : "Match this device", icon: "monitor", onClick: () => pickTheme("system") },
                                    "-",
                                    ...(previewOnly ? [{ l: "Back to the old admin", icon: "back" as const, onClick: () => void leavePreview() }] : []),
                                    { l: "Sign out", icon: "logout", onClick: () => void signOut() },
                                ]} trigger={(t, o) => (
                                    <button type="button" className="hrow-sm" style={{ background: "none", border: 0, cursor: "pointer", minHeight: 44, padding: "0 4px" }}
                                        aria-haspopup="menu" aria-expanded={o} aria-label="Your account" onClick={t}>
                                        <span className="avatar">{initials(user.name)}</span>
                                        <span className="hide-sm" style={{ textAlign: "left", lineHeight: 1.2 }}>
                                            <span className="strong sm" style={{ display: "block" }}>{user.name}</span>
                                            <span className="xs muted">{ROLE_LABEL[role] ?? "Staff"}</span>
                                        </span>
                                    </button>
                                )} />
                            </div>
                            {/* Remounted per page so its children play the entrance again (admin-v2.css, Motion).
                                Keyed by page, not raw pathname: opening an order or a product pushes
                                its own path, and that must not remount the list under the panel. */}
                            <main key={pageKey(pathname)} id="main" className="page" tabIndex={-1}>
                                {children}
                            </main>
                        </div>
                    </div>
                    <CommandPaletteV2 open={pal} onClose={() => setPal(false)} go={go} pages={nav} />
                    <Modal open={!!pending} onClose={() => setPending(null)} title="Leave without saving?" footer={<>
                        <Btn kind="ghost" onClick={() => setPending(null)}>Keep editing</Btn>
                        <Btn kind="danger-solid" onClick={() => { discardRef.current?.(); setDirty(0); const p = pending; setPending(null); if (p) { startRouteTransition(p); router.push(p); } }}>Discard {plural(dirty, "change")}</Btn>
                    </>}>
                        <p className="ink2">You have {plural(dirty, "unsaved change")} in Settings. If you leave now, they&apos;ll be lost.</p>
                    </Modal>
                    <ToasterV2 />
                    <MissTokyoAi />
                </div>
            </AdminV2Context.Provider>
        </MissTokyoAiProvider>
    );
}
