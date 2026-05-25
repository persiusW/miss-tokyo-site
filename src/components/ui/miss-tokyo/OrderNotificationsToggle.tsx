"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { haptic } from "@/lib/haptic";

function urlBase64ToUint8Array(base64: string): Uint8Array {
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    const raw = atob(base64.replace(/-/g, "+").replace(/_/g, "/") + padding);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
}

export function OrderNotificationsToggle() {
    const [supported, setSupported] = useState(false);
    const [subscribed, setSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
        if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;
        setSupported(true);

        navigator.serviceWorker.ready.then(reg =>
            reg.pushManager.getSubscription()
        ).then(sub => {
            setSubscribed(!!sub);
        }).catch(() => {});
    }, []);

    const toggle = async () => {
        if (!supported || loading) return;
        setLoading(true);
        haptic("light");

        try {
            const reg = await navigator.serviceWorker.ready;

            if (subscribed) {
                const sub = await reg.pushManager.getSubscription();
                if (sub) {
                    await fetch("/api/push/subscribe", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ endpoint: sub.endpoint }),
                    });
                    await sub.unsubscribe();
                }
                setSubscribed(false);
            } else {
                const permission = await Notification.requestPermission();
                if (permission !== "granted") { setLoading(false); return; }

                const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
                const sub = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as string,
                });

                await fetch("/api/push/subscribe", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ subscription: sub.toJSON() }),
                });
                haptic("medium");
                setSubscribed(true);
            }
        } catch (err) {
            console.error("[OrderNotificationsToggle]", err);
        } finally {
            setLoading(false);
        }
    };

    if (!supported) return null;

    return (
        <button
            onClick={toggle}
            disabled={loading}
            className={`flex items-center gap-3 w-full bg-[#fdf9f3] border rounded-xl p-4 transition-colors group ${
                subscribed
                    ? "border-[#8b2f30]/30 hover:border-[#8b2f30]/60"
                    : "border-[#e0d5c0] hover:border-[#1a1714]/40"
            } disabled:opacity-50`}
        >
            <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                subscribed ? "bg-[#8b2f30]/10" : "bg-[#1a1714]/5 group-hover:bg-[#1a1714]/10"
            }`}>
                {subscribed
                    ? <Bell size={16} className="text-[#8b2f30]" strokeWidth={1.5} />
                    : <BellOff size={16} className="text-[#4a3f33]" strokeWidth={1.5} />
                }
            </span>
            <span className="min-w-0 text-left">
                <span className="block text-xs font-semibold uppercase tracking-widest text-[#1a1714]">
                    Order updates
                </span>
                <span className="block text-[10px] text-[#8c7e6a]">
                    {loading ? "Updating…" : subscribed ? "Notifications on" : "Tap to enable"}
                </span>
            </span>
            <span className={`ml-auto w-9 h-5 rounded-full transition-colors shrink-0 relative ${
                subscribed ? "bg-[#8b2f30]" : "bg-[#e0d5c0]"
            }`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${
                    subscribed ? "left-4" : "left-0.5"
                }`} />
            </span>
        </button>
    );
}
