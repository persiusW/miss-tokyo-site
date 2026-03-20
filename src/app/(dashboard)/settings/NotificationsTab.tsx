"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { Bell, BellOff, Rss, Send, CheckCircle2 } from "lucide-react";

const TEMPLATE_VARS = [
    { label: "{order_id}",      desc: "Order reference" },
    { label: "{customer_name}", desc: "Customer first name" },
    { label: "{amount}",        desc: "Order total in GH₵" },
];

const DEFAULT_TITLE = "New Order Received!";
const DEFAULT_BODY  = "Order #{order_id} for {amount} from {customer_name} has been paid.";

type PushTemplate = {
    title: string;
    body:  string;
};

function loadSwRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return Promise.resolve(null);
    return navigator.serviceWorker.ready;
}

async function subscribeToPush(): Promise<PushSubscription | null> {
    const reg = await loadSwRegistration();
    if (!reg) return null;

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
        console.warn("[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set");
        return null;
    }

    // Convert base64 VAPID key to Uint8Array
    const raw = atob(vapidKey.replace(/-/g, "+").replace(/_/g, "/"));
    const uint8 = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) uint8[i] = raw.charCodeAt(i);

    return reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: uint8,
    });
}

export function NotificationsTab() {
    const [supported, setSupported]       = useState(true);
    const [permission, setPermission]     = useState<NotificationPermission>("default");
    const [subscribed, setSubscribed]     = useState(false);
    const [loading, setLoading]           = useState(false);
    const [template, setTemplate]         = useState<PushTemplate>({ title: DEFAULT_TITLE, body: DEFAULT_BODY });
    const [saving, setSaving]             = useState(false);
    const [testSending, setTestSending]   = useState(false);
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://misstokyo.shop";

    useEffect(() => {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
            setSupported(false);
            return;
        }
        setPermission(Notification.permission);

        // Register SW if not already registered
        navigator.serviceWorker.register("/sw.js").catch(console.error);

        // Check existing subscription
        navigator.serviceWorker.ready.then(reg =>
            reg.pushManager.getSubscription()
        ).then(sub => {
            setSubscribed(!!sub);
        });

        // Load saved template
        supabase
            .from("push_notification_settings")
            .select("title, body")
            .eq("id", "default")
            .maybeSingle()
            .then(({ data }: { data: any }) => {
                if (data) setTemplate({ title: data.title || DEFAULT_TITLE, body: data.body || DEFAULT_BODY });
            });
    }, []);

    async function handleSubscribe() {
        setLoading(true);
        try {
            const perm = await Notification.requestPermission();
            setPermission(perm);
            if (perm !== "granted") {
                toast.error("Notification permission denied. Please allow notifications in your browser settings.");
                return;
            }

            const sub = await subscribeToPush();
            if (!sub) {
                toast.error("Failed to subscribe — check NEXT_PUBLIC_VAPID_PUBLIC_KEY in .env.local");
                return;
            }

            const res = await fetch("/api/admin/push/subscribe", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ subscription: sub.toJSON() }),
            });

            if (!res.ok) {
                const j = await res.json();
                throw new Error(j.error || "Subscribe failed");
            }

            setSubscribed(true);
            toast.success("Desktop notifications enabled!");
        } catch (err: any) {
            toast.error(err.message || "Failed to enable notifications");
        } finally {
            setLoading(false);
        }
    }

    async function handleUnsubscribe() {
        setLoading(true);
        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (sub) {
                await fetch("/api/admin/push/subscribe", {
                    method:  "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body:    JSON.stringify({ endpoint: sub.endpoint }),
                });
                await sub.unsubscribe();
            }
            setSubscribed(false);
            toast.success("Notifications disabled.");
        } catch (err: any) {
            toast.error(err.message || "Failed to unsubscribe");
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveTemplate() {
        setSaving(true);
        const { error } = await supabase
            .from("push_notification_settings")
            .upsert({ id: "default", title: template.title, body: template.body }, { onConflict: "id" });
        setSaving(false);
        if (error) toast.error("Failed to save template");
        else toast.success("Template saved");
    }

    async function handleTestNotification() {
        if (!subscribed) { toast.error("Enable notifications first"); return; }
        setTestSending(true);
        try {
            const perm = Notification.permission;
            if (perm !== "granted") {
                toast.error("Notification permission is not granted");
                return;
            }
            const reg = await navigator.serviceWorker.ready;
            const body = (template.body || DEFAULT_BODY)
                .replace("{order_id}",      "TEST1234")
                .replace("{customer_name}", "Test Customer")
                .replace("{amount}",        "GH₵ 1,200.00");

            await reg.showNotification(template.title || DEFAULT_TITLE, {
                body,
                tag:  "mt-test",
                data: { url: "/sales/orders" },
                requireInteraction: false,
            });
            toast.success("Test notification sent! Check your system notifications.");
        } catch (err: any) {
            console.error("[push test]", err);
            toast.error(err.message || "Failed — check browser notification permissions");
        } finally {
            setTestSending(false);
        }
    }

    return (
        <div className="space-y-10 max-w-2xl">

            {/* ── Push Notifications ── */}
            <div className="bg-white border border-neutral-200 p-6 space-y-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-xs font-semibold uppercase tracking-widest mb-1">Desktop Notifications</h2>
                        <p className="text-[11px] text-neutral-500 leading-relaxed">
                            Get a browser desktop notification instantly when a new order is placed.
                            Each admin browser must subscribe separately.
                        </p>
                    </div>
                    {subscribed
                        ? <CheckCircle2 size={20} className="text-emerald-500 shrink-0 mt-0.5" />
                        : <Bell size={20} className="text-neutral-300 shrink-0 mt-0.5" />
                    }
                </div>

                {!supported && (
                    <div className="bg-amber-50 border border-amber-200 px-4 py-3 text-[11px] text-amber-700 rounded-sm">
                        Your browser doesn&apos;t support Web Push notifications.
                    </div>
                )}

                {supported && (
                    <>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${subscribed ? "bg-emerald-400" : "bg-neutral-300"}`} />
                            <span className="text-xs text-neutral-600">
                                {subscribed ? "Subscribed on this device" : "Not subscribed on this device"}
                            </span>
                        </div>

                        {permission === "denied" && (
                            <p className="text-[11px] text-red-500">
                                Notifications are blocked. Open browser settings → Site Settings → Notifications and allow this site.
                            </p>
                        )}

                        <div className="flex gap-3">
                            {!subscribed ? (
                                <button
                                    type="button"
                                    onClick={handleSubscribe}
                                    disabled={loading || permission === "denied" || !supported}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-black text-white text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-40"
                                >
                                    <Bell size={12} />
                                    {loading ? "Subscribing…" : "Enable Notifications"}
                                </button>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleTestNotification}
                                        disabled={testSending}
                                        className="flex items-center gap-2 px-4 py-2.5 border border-neutral-300 text-neutral-600 text-[10px] uppercase tracking-widest hover:bg-neutral-50 transition-colors disabled:opacity-40"
                                    >
                                        <Send size={12} />
                                        {testSending ? "Sending…" : "Send Test"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleUnsubscribe}
                                        disabled={loading}
                                        className="flex items-center gap-2 px-4 py-2.5 border border-neutral-200 text-neutral-400 text-[10px] uppercase tracking-widest hover:text-red-500 hover:border-red-200 transition-colors disabled:opacity-40"
                                    >
                                        <BellOff size={12} />
                                        Disable
                                    </button>
                                </>
                            )}
                        </div>

                        <div className="border-t border-neutral-100 pt-4 space-y-1">
                            <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-semibold">Setup</p>
                            <p className="text-[10px] text-neutral-500 leading-relaxed">
                                Generate VAPID keys once and add to <code className="bg-neutral-100 px-1 rounded">.env.local</code>:
                            </p>
                            <pre className="text-[10px] bg-neutral-50 border border-neutral-100 p-3 rounded text-neutral-600 overflow-x-auto leading-relaxed">{`npx web-push generate-vapid-keys

NEXT_PUBLIC_VAPID_PUBLIC_KEY=<publicKey>
VAPID_PRIVATE_KEY=<privateKey>
VAPID_SUBJECT=mailto:admin@misstokyo.shop`}</pre>
                        </div>
                    </>
                )}
            </div>

            {/* ── Notification Template ── */}
            <div className="bg-white border border-neutral-200 p-6 space-y-5">
                <div>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-1">Notification Template</h2>
                    <p className="text-[11px] text-neutral-500">Customise what appears in the desktop push notification for new orders.</p>
                </div>

                <div>
                    <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Title</label>
                    <input
                        type="text"
                        value={template.title}
                        onChange={e => setTemplate(t => ({ ...t, title: e.target.value }))}
                        placeholder={DEFAULT_TITLE}
                        className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors"
                    />
                </div>

                <div>
                    <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Body</label>
                    <textarea
                        rows={3}
                        value={template.body}
                        onChange={e => setTemplate(t => ({ ...t, body: e.target.value }))}
                        placeholder={DEFAULT_BODY}
                        className="w-full border border-neutral-200 bg-transparent p-3 outline-none focus:border-black text-sm transition-colors resize-none"
                    />
                </div>

                <div className="bg-neutral-50 border border-neutral-100 p-3 space-y-2">
                    <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Available variables</p>
                    <div className="flex flex-wrap gap-2">
                        {TEMPLATE_VARS.map(v => (
                            <span key={v.label} className="font-mono text-[10px] px-2 py-1 bg-white border border-neutral-200 text-neutral-600 rounded-sm">
                                {v.label} <span className="text-neutral-400">— {v.desc}</span>
                            </span>
                        ))}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleSaveTemplate}
                    disabled={saving}
                    className="px-5 py-2.5 bg-black text-white text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50"
                >
                    {saving ? "Saving…" : "Save Template"}
                </button>
            </div>

            {/* ── RSS Feed ── */}
            <div className="bg-white border border-neutral-200 p-6 space-y-4">
                <div className="flex items-start gap-3">
                    <Rss size={18} className="text-orange-400 shrink-0 mt-0.5" />
                    <div>
                        <h2 className="text-xs font-semibold uppercase tracking-widest mb-1">RSS Feed — New Arrivals</h2>
                        <p className="text-[11px] text-neutral-500 leading-relaxed">
                            A public RSS feed of your 20 most recent active products. Automatically updates every hour.
                            Share this link with customers or plug it into RSS readers and aggregators.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-100 px-3 py-2.5 rounded-sm">
                    <code className="text-xs text-neutral-700 flex-1 break-all">{baseUrl}/rss.xml</code>
                    <button
                        type="button"
                        onClick={() => {
                            navigator.clipboard.writeText(`${baseUrl}/rss.xml`);
                            toast.success("Copied!");
                        }}
                        className="text-[10px] uppercase tracking-widest text-neutral-500 hover:text-black transition-colors whitespace-nowrap"
                    >
                        Copy
                    </button>
                </div>

                <p className="text-[10px] text-neutral-400">
                    Excludes wholesale-only products. Only published (active) products appear.
                </p>
            </div>
        </div>
    );
}
