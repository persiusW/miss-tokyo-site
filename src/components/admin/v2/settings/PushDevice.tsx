"use client";

// New-order alerts on this device (was Settings › Notifications). Each phone
// or computer subscribes for itself through /api/admin/push/subscribe, so this
// switch saves straight away and isn't part of the section's draft.
import { useEffect, useState } from "react";
import { Banner, Btn, Switch, toast } from "@/components/admin/ui";

const DEFAULT_TITLE = "New Order Received!";
const DEFAULT_BODY = "Order #{order_id} for {amount} from {customer_name} has been paid.";

function vapidBytes(key: string): Uint8Array {
    const pad = "=".repeat((4 - (key.length % 4)) % 4);
    const raw = atob((key + pad).replace(/-/g, "+").replace(/_/g, "/"));
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
}

export function PushDevice() {
    const [supported, setSupported] = useState<boolean | null>(null);
    const [perm, setPerm] = useState<NotificationPermission>("default");
    const [on, setOn] = useState(false);
    const [busy, setBusy] = useState(false);
    const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    useEffect(() => {
        if (!("serviceWorker" in navigator) || !("PushManager" in window) || typeof Notification === "undefined") { setSupported(false); return; }
        setSupported(true);
        setPerm(Notification.permission);
        navigator.serviceWorker.register("/sw.js").catch(() => { /* the shell registers it too */ });
        navigator.serviceWorker.ready.then(r => r.pushManager.getSubscription()).then(s => setOn(!!s)).catch(() => setOn(false));
    }, []);

    const flip = async (next: boolean) => {
        setBusy(true);
        try {
            const reg = await navigator.serviceWorker.ready;
            if (next) {
                const p = await Notification.requestPermission();
                setPerm(p);
                if (p !== "granted") { toast.error("Notifications are blocked for this site. Allow them in the browser's site settings, then try again."); return; }
                if (!vapid) { toast.error("Alerts aren't set up on this site yet. Ask your developer to add the notification keys."); return; }
                const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidBytes(vapid) as unknown as BufferSource });
                const res = await fetch("/api/admin/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON() }) });
                if (!res.ok) { await sub.unsubscribe().catch(() => null); toast.fromResponse(await res.json().catch(() => null), { audience: "staff" }); return; }
                setOn(true);
                toast.success("New-order alerts are on for this device");
            } else {
                const sub = await reg.pushManager.getSubscription();
                if (sub) {
                    await fetch("/api/admin/push/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
                    await sub.unsubscribe();
                }
                setOn(false);
                toast.success("New-order alerts are off for this device");
            }
        } catch {
            toast.error("We couldn't change alerts on this device. Please try again.");
        } finally { setBusy(false); }
    };

    if (supported === false) return <span className="sm muted">This browser can&apos;t show alerts.</span>;
    return (
        <span className="hrow-sm">
            {perm === "denied" && <span className="xs muted">Blocked in this browser</span>}
            <Switch label="New-order alerts on this device" checked={on} disabled={busy || supported === null || perm === "denied"} onChange={v => void flip(v)} />
        </span>
    );
}

/** The alert's text, with a local test that shows it on this device. */
export function PushTemplate({ title, body, onBody, setupMissing }: { title: string; body: string; onBody: (v: string) => void; setupMissing: boolean }) {
    const test = async () => {
        try {
            if (typeof Notification === "undefined" || Notification.permission !== "granted") { toast.error("Turn on new-order alerts on this device first."); return; }
            const reg = await navigator.serviceWorker.ready;
            const text = (body || DEFAULT_BODY).replace("{order_id}", "TEST1234").replace("{customer_name}", "Test Customer").replace("{amount}", "GH₵ 1,200.00");
            await reg.showNotification(title || DEFAULT_TITLE, { body: text, tag: "mt-test", data: { url: "/sales/orders" } });
            toast.success("Test alert shown on this device");
        } catch {
            toast.error("We couldn't show a test alert. Check this browser allows notifications.");
        }
    };
    return (
        <div className="stack-sm" style={{ width: "100%" }}>
            <textarea id="set-push-body" aria-label="Alert text" className="textarea" style={{ minHeight: 72, width: "100%" }} value={body} placeholder={DEFAULT_BODY} onChange={e => onBody(e.target.value)} />
            <div className="hrow-sm wrap">
                <Btn sm onClick={() => void test()}>Send a test to this device</Btn>
            </div>
            {setupMissing && <Banner tone="warn" title="Alerts aren't set up on this site">The notification keys are missing, so no device can turn alerts on. Ask your developer to add them.</Banner>}
        </div>
    );
}
