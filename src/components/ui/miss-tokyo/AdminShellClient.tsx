"use client";

import { useState, useEffect, ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";

export type Theme = "dark" | "light" | "system";

type Props = {
    children: ReactNode;
    businessName: string;
    isFullAccess: boolean;
    showCustomRequests: boolean;
    user: { name: string; initials: string; role: string };
};

export function AdminShellClient({ children, businessName, isFullAccess, showCustomRequests, user }: Props) {
    const [navOpen, setNavOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [theme, setTheme] = useState<Theme>("system");

    useEffect(() => {
        const stored = localStorage.getItem("ac-theme") as Theme | null;
        if (stored === "dark" || stored === "light" || stored === "system") {
            setTheme(stored);
        }
        const collapsed = localStorage.getItem("ac-sidebar-collapsed") === "true";
        setSidebarCollapsed(collapsed);
    }, []);

    const handleTheme = (t: Theme) => {
        setTheme(t);
        localStorage.setItem("ac-theme", t);
    };

    const handleToggleCollapse = () => {
        setSidebarCollapsed(c => {
            localStorage.setItem("ac-sidebar-collapsed", String(!c));
            return !c;
        });
    };

    const dataTheme = theme === "system" ? undefined : theme;

    return (
        <div className="admin-shell" {...(dataTheme ? { "data-theme": dataTheme } : {})}>
            <div
                className={`admin-sidebar-scrim${navOpen ? " on" : ""}`}
                onClick={() => setNavOpen(false)}
                aria-hidden="true"
            />

            <AdminSidebar
                businessName={businessName}
                isFullAccess={isFullAccess}
                showCustomRequests={showCustomRequests}
                mobileOpen={navOpen}
                onClose={() => setNavOpen(false)}
                collapsed={sidebarCollapsed}
                onToggleCollapse={handleToggleCollapse}
            />

            <div className="admin-main">
                <AdminTopbar
                    user={user}
                    onMenu={() => setNavOpen(true)}
                    theme={theme}
                    onTheme={handleTheme}
                />
                <div className="admin-page">
                    {children}
                </div>
            </div>
        </div>
    );
}
