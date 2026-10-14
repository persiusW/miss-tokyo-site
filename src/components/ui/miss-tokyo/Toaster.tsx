"use client";

import { useSyncExternalStore } from "react";
import { subscribe, getSnapshot, dismiss, Toast } from "@/lib/toast";

const EMPTY_TOASTS: Toast[] = [];

const STYLES = {
    success: "bg-black text-white",
    error: "bg-red-600 text-white",
    info: "bg-neutral-700 text-white",
};

export function Toaster() {
    const toasts = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_TOASTS);

    // Always rendered, so the live region exists before the first toast.
    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 no-print" role="status" aria-live="polite">
            {toasts.map(t => (
                <div
                    key={t.id}
                    className={`px-5 py-3 text-xs uppercase tracking-widest font-semibold shadow-lg toast-enter flex items-start gap-3 ${STYLES[t.type]}`}
                >
                    <span className="flex-1">{t.message}</span>
                    {t.type === "error" && (
                        <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="opacity-80 hover:opacity-100 leading-none">×</button>
                    )}
                </div>
            ))}
        </div>
    );
}
