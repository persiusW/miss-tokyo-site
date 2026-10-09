"use client";

// "Show me": waits (up to 10s) for the registered control on the current page,
// scrolls to it and rings it. The ring never blocks clicks.
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useMissTokyoAi } from "@/lib/ai/missTokyoAi/client/store";
import { ANCHORS, type AnchorId } from "@/lib/ai/missTokyoAi/anchors";

type Box = { top: number; left: number; width: number; height: number };

const WAIT_MS = 10_000;
const SHOW_MS = 15_000;

function visibleRect(el: Element): DOMRect | null {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? r : null;
}

export function Spotlight() {
    const { spotlight, setSpotlight } = useMissTokyoAi();
    const pathname = usePathname();
    const [box, setBox] = useState<Box | null>(null);
    const [missing, setMissing] = useState(false);

    useEffect(() => {
        setBox(null);
        setMissing(false);
        if (!spotlight) return;
        if (Date.now() - spotlight.startedAt > 60_000) { setSpotlight(null); return; }
        const selector = `[data-assist="${CSS.escape(spotlight.anchor)}"]`;
        let el: Element | null = null;
        let raf = 0;
        const started = Date.now();
        let doneTimer: ReturnType<typeof setTimeout> | undefined;

        const track = () => {
            if (!el) return;
            const r = visibleRect(el);
            if (r) setBox({ top: r.top - 6, left: r.left - 6, width: r.width + 12, height: r.height + 12 });
            raf = requestAnimationFrame(track);
        };
        const poll = setInterval(() => {
            const found = Array.from(document.querySelectorAll(selector)).find(n => visibleRect(n));
            if (found) {
                clearInterval(poll);
                el = found;
                el.scrollIntoView({ block: "center", behavior: "smooth" });
                raf = requestAnimationFrame(track);
                doneTimer = setTimeout(() => setSpotlight(null), SHOW_MS);
            } else if (Date.now() - started > WAIT_MS) {
                clearInterval(poll);
                setMissing(true);
                doneTimer = setTimeout(() => setSpotlight(null), 5000);
            }
        }, 200);
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSpotlight(null); };
        window.addEventListener("keydown", onKey);
        return () => {
            clearInterval(poll);
            cancelAnimationFrame(raf);
            if (doneTimer) clearTimeout(doneTimer);
            window.removeEventListener("keydown", onKey);
        };
    }, [spotlight, pathname, setSpotlight]);

    if (!spotlight) return null;
    const label = ANCHORS[spotlight.anchor as AnchorId]?.label ?? "Here it is";

    if (missing) {
        return (
            <div className="mtai-ring-card" role="status" style={{ right: 20, bottom: 84 }}>
                <span>I couldn't find that on this page. It may be in a tab or section that isn't open.</span>
                <button type="button" onClick={() => setSpotlight(null)}>OK</button>
            </div>
        );
    }
    if (!box) return null;
    const below = box.top + box.height + 12;
    const cardTop = below + 120 < window.innerHeight ? below : Math.max(12, box.top - 110);
    const cardLeft = Math.min(Math.max(12, box.left), window.innerWidth - 292);
    return (
        <>
            <div className="mtai-ring" aria-hidden="true" style={box} />
            <div className="mtai-ring-card" role="status" style={{ top: cardTop, left: cardLeft }}>
                <span>{label}</span>
                <button type="button" onClick={() => setSpotlight(null)}>Got it</button>
            </div>
        </>
    );
}
