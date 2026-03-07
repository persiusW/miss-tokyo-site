"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
    const router = useRouter();

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
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
