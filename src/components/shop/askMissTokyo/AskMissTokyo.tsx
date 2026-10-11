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
    useEffect(() => {
        if (process.env.NODE_ENV !== "production") (window as any).__openCart = () => useCart.getState().setIsOpen(true);
    }, []);
    if (!enabled || widgetHiddenOn(pathname) || cartOpen) return null;

    return (
        <>
            {/* Phones: a 48px round icon button, clear of the shop's own buttons. md and up: the labelled pill. */}
            {!open && (
                <button
                    ref={buttonRef}
                    type="button"
                    data-ask-mt="launcher"
                    aria-label="Ask Miss Tokyo — chat with our shop assistant"
                    onClick={() => setOpen(true)}
                    className="ask-mt-launcher fixed right-4 md:right-6 z-[45] flex items-center justify-center md:justify-start w-12 md:w-auto h-12 md:gap-2 md:pl-4 md:pr-5 rounded-full bg-black text-[#f5f0e8] shadow-xl text-[11px] uppercase tracking-[0.2em] font-semibold"
                >
                    <MessageCircle size={18} aria-hidden="true" />
                    <span className="sr-only md:not-sr-only">Ask Miss Tokyo</span>
                </button>
            )}
            {loaded && <Panel open={open} onClose={() => { setOpen(false); requestAnimationFrame(() => buttonRef.current?.focus()); }} />}
        </>
    );
}
