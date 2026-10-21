"use client";

// Admin v2 toasts: bottom centre, ink background, optional action such as Undo.
// Same store as the old Toaster (lib/toast), so every existing toast call works.
import { useSyncExternalStore } from "react";
import { subscribe, getSnapshot, dismiss, getAskHandler, type Toast } from "@/lib/toast";

const EMPTY: Toast[] = [];

export function ToasterV2() {
    const toasts = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
    return (
        <div className="toasts" role="status" aria-live="polite">
            {toasts.slice(-3).map(t => (
                <div key={t.id} className={`toast${t.type === "error" ? " err" : ""}`}>
                    <span>{t.message}</span>
                    {t.action && (
                        <button type="button" className="link-btn" onClick={() => { t.action!.onClick(); dismiss(t.id); }}>{t.action.label}</button>
                    )}
                    {t.ask && getAskHandler() && (
                        <button type="button" className="link-btn"
                            onClick={() => { const h = getAskHandler(); if (h && t.ask && h(t.ask)) dismiss(t.id); }}>
                            Ask Miss Tokyo AI
                        </button>
                    )}
                    {t.type === "error" && <button type="button" className="x" aria-label="Dismiss" onClick={() => dismiss(t.id)}>×</button>}
                </div>
            ))}
        </div>
    );
}
