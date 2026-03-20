"use client";

import { useSyncExternalStore } from "react";
import { subscribe, getSnapshot, Toast } from "@/lib/toast";

const EMPTY_TOASTS: Toast[] = [];

const STYLES = {
    success: "bg-black text-white",
    error: "bg-red-600 text-white",
    info: "bg-neutral-700 text-white",
};

export function Toaster() {
    const toasts = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_TOASTS);

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 no-print">
            {toasts.map(t => (
                <div
                    key={t.id}
                    className={`px-5 py-3 text-xs uppercase tracking-widest font-semibold shadow-lg toast-enter ${STYLES[t.type]}`}
                >
                    {t.message}
                </div>
            ))}
        </div>
    );
}
