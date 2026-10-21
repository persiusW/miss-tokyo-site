"use client";

// The new-order alert opt-in from the old Overview (PushNotificationBanner),
// as a neutral Banner. Same behaviour: shown while this browser can take push
// alerts and has none yet; "Turn on" asks permission and subscribes through
// /api/admin/push/subscribe; "Not now" hides it until the next visit.
import { useEffect, useState } from "react";
import { Banner, Btn, IconBtn, toast } from "@/components/admin/ui";

function vapidBytes(key: string): Uint8Array {
    const pad = "=".repeat((4 - (key.length % 4)) % 4);
    const raw = atob((key + pad).replace(/-/g, "+").replace(/_/g, "/"));
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
}

export function PushOptInBanner() {
    const [show, setShow] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!("serviceWorker" in navigator) || !("PushManager" in window) || typeof Notification === "undefined") return;
        if (Notification.permission === "granted") {
            navigator.serviceWorker.ready.then(reg => reg.pushManager.getSubscription()).then(sub => { if (!sub) setShow(true); }).catch(() => null);
        } else if (Notification.permission === "default") {
            setShow(true);
        }
    }, []);

    const enable = async () => {
        setBusy(true);
        try {
            const perm = await Notification.requestPermission();
            if (perm !== "granted") { setShow(false); return; }
            await navigator.serviceWorker.register("/sw.js");
            const reg = await navigator.serviceWorker.ready;
            const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!vapid) { setShow(false); return; }
            const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidBytes(vapid) as unknown as BufferSource });
            const res = await fetch("/api/admin/push/subscribe", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON() }),
            });
            if (!res.ok) { toast.fromResponse(await res.json().catch(() => null), { audience: "staff" }); return; }
            toast.success("New-order alerts are on for this device");
            setShow(false);
        } catch {
            toast.error("We couldn't turn on alerts on this device. Please try again.");
            setShow(false);
        } finally {
            setBusy(false);
        }
    };

    if (!show) return null;
    return (
        <Banner tone="neutral" title="Get an alert when a new order is paid"
            action={
                <span className="hrow-sm">
                    <Btn sm onClick={() => void enable()} disabled={busy}>{busy ? "Turning on…" : "Turn on"}</Btn>
                    <IconBtn icon="x" label="Not now" onClick={() => setShow(false)} />
                </span>
            }>
            This device shows a notification as soon as an order is paid.
        </Banner>
    );
}
