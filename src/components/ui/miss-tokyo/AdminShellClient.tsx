"use client";

import { useState, ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";

type Props = {
    children: ReactNode;
    businessName: string;
    isFullAccess: boolean;
    showCustomRequests: boolean;
    user: { name: string; initials: string; role: string };
};

export function AdminShellClient({ children, businessName, isFullAccess, showCustomRequests, user }: Props) {
    const [navOpen, setNavOpen] = useState(false);

    return (
        <div className="admin-shell">
            {/* Mobile sidebar scrim */}
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
            />

            <div className="admin-main">
                <AdminTopbar user={user} onMenu={() => setNavOpen(true)} />
                <div className="admin-page">
                    {children}
                </div>
            </div>
        </div>
    );
}
