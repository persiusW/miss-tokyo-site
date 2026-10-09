"use client";

// The topbar bell. With mtai_bell_enabled off it is the same inert button as
// before. On: admin sees open Send to admin questions and goes to the inbox;
// everyone else sees unread replies and opens the Miss Tokyo AI panel.
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Badge = { enabled: boolean; count: number; kind: "inbox" | "replies" | null };

const BellIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 1 1 12 0c0 6 2 7 2 7H4s2-1 2-7Z" />
        <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
);

export function AiBell() {
    const router = useRouter();
    const [badge, setBadge] = useState<Badge>({ enabled: false, count: 0, kind: null });

    const refresh = useCallback(async () => {
        try {
            const res = await fetch("/api/ai/badge");
            if (!res.ok) return;
            const d = await res.json();
            setBadge({
                enabled: d?.enabled === true,
                count: Number.isInteger(d?.count) && d.count > 0 ? d.count : 0,
                kind: d?.kind === "inbox" || d?.kind === "replies" ? d.kind : null,
            });
        } catch { /* keep the last count */ }
    }, []);

    useEffect(() => {
        void refresh();
        const t = setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 60_000);
        const onFocus = () => void refresh();
        window.addEventListener("focus", onFocus);
        window.addEventListener("mtai:badge-refresh", onFocus);
        return () => {
            clearInterval(t);
            window.removeEventListener("focus", onFocus);
            window.removeEventListener("mtai:badge-refresh", onFocus);
        };
    }, [refresh]);

    if (!badge.enabled) {
        return <button className="admin-icon-btn" title="Notifications" type="button"><BellIcon /></button>;
    }

    const label = badge.kind === "inbox"
        ? (badge.count ? `${badge.count} open question${badge.count === 1 ? "" : "s"} in the AI inbox` : "AI inbox")
        : (badge.count ? `${badge.count} new repl${badge.count === 1 ? "y" : "ies"} from the Miss Tokyo team` : "Notifications");

    return (
        <button
            className="admin-icon-btn mtai-bell"
            title={label}
            aria-label={label}
            type="button"
            onClick={() => {
                if (badge.kind === "inbox") router.push("/ai/inbox");
                else window.dispatchEvent(new Event("mtai:open"));
            }}
        >
            <BellIcon />
            {badge.count > 0 && <span className="mtai-bell-count" aria-hidden="true">{badge.count > 9 ? "9+" : badge.count}</span>}
        </button>
    );
}
