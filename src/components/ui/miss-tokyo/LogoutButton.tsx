"use client";

import { ReactNode } from "react";

type Props = {
    className?: string;
    iconEl?: ReactNode;
};

export function LogoutButton({ className, iconEl }: Props = {}) {
    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/admin/login";
    };

    const cls = className ?? "block px-4 py-2 text-sm text-neutral-500 hover:text-black transition-colors w-full text-left";

    return (
        <button onClick={handleLogout} className={cls} type="button">
            {iconEl}
            <span className="admin-foot-label">Sign Out</span>
        </button>
    );
}
