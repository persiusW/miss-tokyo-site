"use client";
// The round "Ask Miss Tokyo" button. The panel loads on first tap, so only
// this ships with every shop page.
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { useCart } from "@/store/useCart";
import { useAskStore } from "./chatStore";
import { widgetHiddenOn } from "./visibility";

const Panel = dynamic(() => import("./AskMissTokyoPanel"), { ssr: false });

export function AskMissTokyo({ enabled }: { enabled: boolean }) {
    const pathname = usePathname() ?? "/";
    const cartOpen = useCart(s => s.isOpen);
    const { open, setOpen } = useAskStore();
    const [loaded, setLoaded] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => { if (open) setLoaded(true); }, [open]);
    if (!enabled || widgetHiddenOn(pathname) || cartOpen) return null;

    return (
        <>
            {!open && (
                <button
                    ref={buttonRef}
                    type="button"
                    data-ask-mt="launcher"
                    aria-label="Ask Miss Tokyo — chat with our shop assistant"
                    onClick={() => setOpen(true)}
                    className="ask-mt-launcher fixed right-4 md:right-6 z-[45] flex items-center gap-2 rounded-full bg-black text-[#f5f0e8] pl-4 pr-5 h-12 shadow-xl text-[11px] uppercase tracking-[0.2em] font-semibold"
                >
                    <MessageCircle size={18} aria-hidden="true" />
                    <span>Ask Miss Tokyo</span>
                </button>
            )}
            {loaded && <Panel open={open} onClose={() => { setOpen(false); requestAnimationFrame(() => buttonRef.current?.focus()); }} />}
        </>
    );
}
