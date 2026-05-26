"use client";

import { useEffect, useState } from "react";
import { X, Download, Share2 } from "lucide-react";
import { haptic } from "@/lib/haptic";

const DISMISSED_KEY = "pwa-install-dismissed-v2";
const SHOW_DELAY_MS = 5000;

export function PWAInstallBanner() {
    const [show, setShow] = useState(false);
    const [visible, setVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    useEffect(() => {
        if (
            window.matchMedia("(display-mode: standalone)").matches ||
            (navigator as any).standalone === true ||
            localStorage.getItem(DISMISSED_KEY)
        ) return;

        const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(ios);

        const reveal = () => {
            setShow(true);
            requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
        };

        if (ios) {
            const t = setTimeout(reveal, SHOW_DELAY_MS);
            return () => clearTimeout(t);
        }

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setTimeout(reveal, SHOW_DELAY_MS);
        };
        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const dismiss = () => {
        haptic("light");
        setVisible(false);
        setTimeout(() => setShow(false), 300);
        localStorage.setItem(DISMISSED_KEY, "1");
    };

    const install = async () => {
        if (!deferredPrompt) return;
        haptic("medium");
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") dismiss();
    };

    const share = async () => {
        haptic("medium");
        try {
            await navigator.share({
                title: "Miss Tokyo",
                url: window.location.href,
            });
        } catch {
            // cancelled or unsupported — no-op
        }
    };

    if (!show) return null;

    return (
        <div
            className={`fixed bottom-[76px] left-3 right-3 z-[148] md:hidden transition-all duration-300 ease-out ${
                visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
        >
            <div className="bg-[#141210] border border-white/10 text-white px-4 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
                {/* Brand icon */}
                <div className="w-10 h-10 rounded-xl bg-[#C9963A]/20 flex items-center justify-center shrink-0">
                    <Download size={18} className="text-[#C9963A]" />
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white mb-0.5">
                        Add to Home Screen
                    </p>
                    <p className="text-[10px] text-neutral-400">
                        {isIOS ? "Open share sheet to install." : "Install Miss Tokyo for faster access."}
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {isIOS ? (
                        <button
                            onClick={share}
                            className="text-[10px] uppercase tracking-widest font-bold text-[#C9963A] hover:text-amber-300 transition-colors whitespace-nowrap px-3 py-1.5 border border-[#C9963A]/30 rounded-lg hover:border-[#C9963A]/60 flex items-center gap-1.5"
                        >
                            <Share2 size={11} />
                            Share
                        </button>
                    ) : (
                        <button
                            onClick={install}
                            className="text-[10px] uppercase tracking-widest font-bold text-[#C9963A] hover:text-amber-300 transition-colors whitespace-nowrap px-3 py-1.5 border border-[#C9963A]/30 rounded-lg hover:border-[#C9963A]/60"
                        >
                            Install
                        </button>
                    )}
                    <button
                        onClick={dismiss}
                        className="text-neutral-600 hover:text-white transition-colors p-1"
                        aria-label="Dismiss"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
