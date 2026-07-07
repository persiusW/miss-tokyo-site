"use client";

import { ReactNode } from "react";

type Props = {
    className?: string;
    iconEl?: ReactNode;
};

export function LogoutButton({ className, iconEl }: Props = {}) {
    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        // Tell the service worker to drop cached authenticated pages so a
        // logged-out session can't see a stale dashboard shell.
        navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_PRIVATE_CACHE" });
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
