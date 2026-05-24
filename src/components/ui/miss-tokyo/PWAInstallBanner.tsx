"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const DISMISSED_KEY = "pwa-install-dismissed";

export function PWAInstallBanner() {
    const [show, setShow] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    useEffect(() => {
        // Already installed or dismissed
        if (
            window.matchMedia("(display-mode: standalone)").matches ||
            (navigator as any).standalone === true ||
            localStorage.getItem(DISMISSED_KEY)
        ) return;

        const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(ios);

        if (ios) {
            // iOS: no install event, just show tip after delay
            const t = setTimeout(() => setShow(true), 4000);
            return () => clearTimeout(t);
        }

        // Android/Chrome: wait for beforeinstallprompt
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setTimeout(() => setShow(true), 4000);
        };
        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const dismiss = () => {
        setShow(false);
        localStorage.setItem(DISMISSED_KEY, "1");
    };

    const install = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") dismiss();
    };

    if (!show) return null;

    return (
        <div className="fixed bottom-20 left-4 right-4 z-[150] md:hidden">
            <div className="bg-neutral-900 text-white px-4 py-3 flex items-start gap-3 shadow-2xl">
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-widest mb-1">Add to Home Screen</p>
                    {isIOS ? (
                        <p className="text-[11px] text-neutral-400 leading-relaxed">
                            Tap <span className="text-white">Share</span> then <span className="text-white">Add to Home Screen</span> for the full app.
                        </p>
                    ) : (
                        <p className="text-[11px] text-neutral-400 leading-relaxed">Install Miss Tokyo for faster access.</p>
                    )}
                </div>
                {!isIOS && (
                    <button
                        onClick={install}
                        className="shrink-0 text-[10px] uppercase tracking-widest font-semibold text-amber-400 hover:text-amber-300 transition-colors whitespace-nowrap mt-0.5"
                    >
                        Install
                    </button>
                )}
                <button onClick={dismiss} className="shrink-0 text-neutral-500 hover:text-white transition-colors mt-0.5">
                    <X size={14} />
                </button>
            </div>
        </div>
    );
}
