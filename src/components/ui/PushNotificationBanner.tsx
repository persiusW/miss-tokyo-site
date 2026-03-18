"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";

export function PushNotificationBanner() {
    const [show, setShow]         = useState(false);
    const [loading, setLoading]   = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
        if (Notification.permission === "granted") {
            navigator.serviceWorker.ready.then(reg =>
                reg.pushManager.getSubscription()
            ).then(sub => {
                if (!sub) setShow(true);
            });
        } else if (Notification.permission === "default") {
            setShow(true);
        }
    }, []);

    async function handleEnable() {
        setLoading(true);
        try {
            const perm = await Notification.requestPermission();
            if (perm !== "granted") { setDismissed(true); setShow(false); return; }

            await navigator.serviceWorker.register("/sw.js");
            const reg = await navigator.serviceWorker.ready;

            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!vapidKey) { setShow(false); return; }

            const raw = atob(vapidKey.replace(/-/g, "+").replace(/_/g, "/"));
            const uint8 = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; i++) uint8[i] = raw.charCodeAt(i);

            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: uint8,
            });

            await fetch("/api/admin/push/subscribe", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ subscription: sub.toJSON() }),
            });

            setShow(false);
        } catch (err) {
            console.error("[push banner] Error:", err);
            setShow(false);
        } finally {
            setLoading(false);
        }
    }

    if (!show || dismissed) return null;

    return (
        <div className="mb-6 flex items-center justify-between gap-4 border border-neutral-200 bg-neutral-50 px-4 py-3">
            <div className="flex items-center gap-3">
                <Bell size={14} className="text-neutral-500 shrink-0" />
                <p className="text-xs text-neutral-600">
                    Enable desktop notifications to be alerted instantly when a new order is placed.
                </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
                <button
                    type="button"
                    onClick={handleEnable}
                    disabled={loading}
                    className="text-[10px] uppercase tracking-widest text-black font-semibold hover:underline disabled:opacity-50"
                >
                    {loading ? "Enabling…" : "Enable"}
                </button>
                <button
                    type="button"
                    onClick={() => setDismissed(true)}
                    className="text-neutral-400 hover:text-black transition-colors"
                    aria-label="Dismiss"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
}
