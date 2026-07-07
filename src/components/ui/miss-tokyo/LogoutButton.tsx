"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
    const router = useRouter();

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        // Tell the service worker to drop cached authenticated pages so a
        // logged-out session can't see a stale dashboard shell.
        navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_PRIVATE_CACHE" });
        window.location.href = "/admin/login";
    };

    return (
        <button
            onClick={handleLogout}
            className="block px-4 py-2 text-sm text-neutral-500 hover:text-black transition-colors w-full text-left"
        >
            Sign Out
        </button>
    );
}
