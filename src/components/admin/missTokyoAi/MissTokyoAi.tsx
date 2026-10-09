"use client";

// Miss Tokyo AI on every dashboard page: launcher, first-time tip, the panel
// (slide-over from 768px, full-screen sheet on phones) and Show me. Mounted
// once inside .admin-shell, so it keeps its chat across page changes and
// escapes the topbar's backdrop-filter. Hidden on /agent, which shows the same
// chat full-page.
import { createContext, useContext, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { usePathname } from "next/navigation";
import { useMissTokyoAi } from "@/lib/ai/missTokyoAi/client/store";
import { ChatSurface, type ChatUser } from "./ChatSurface";
import { Spotlight } from "./Spotlight";
import { Spark } from "./icons";
import "./mtai.css";

const TIP_KEY = "mt.assistant.tipSeen";

const UserContext = createContext<ChatUser>({ firstName: null, role: "sales_staff" });
export const useMissTokyoAiUser = () => useContext(UserContext);

/** First word of the name, letters only, at most 24 characters. */
export function firstNameFrom(name: string | null | undefined): string | null {
    const word = String(name ?? "").trim().split(/\s+/)[0] ?? "";
    if (!word || word.includes("@")) return null;
    const letters = word.replace(/[^\p{L}'-]/gu, "").slice(0, 24);
    return letters || null;
}

export function MissTokyoAiProvider({ user, children }: { user: { name: string; role: string }; children: React.ReactNode }) {
    const value = { firstName: firstNameFrom(user.name), role: user.role };
    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function MissTokyoAi() {
    const user = useMissTokyoAiUser();
    const pathname = usePathname();
    const { open, setOpen, hydrate, hydrated, availability, setAvailability, setFeatures } = useMissTokyoAi();
    const [tip, setTip] = useState(false);
    const [drag, setDrag] = useState(0);
    const dragStart = useRef<number | null>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const launcherRef = useRef<HTMLButtonElement>(null);
    const [openCount, setOpenCount] = useState(0);
    const onAgentPage = pathname === "/agent";
    const onPos = pathname === "/pos";

    useEffect(() => { hydrate(); }, [hydrate]);

    // Is Miss Tokyo AI on and set up? Asked once per page load.
    useEffect(() => {
        if (availability !== "unknown") return;
        let cancelled = false;
        fetch("/api/ai/agent", { method: "GET" })
            .then(r => r.json())
            .then(d => {
                if (cancelled) return;
                if (d?.features && typeof d.features === "object") setFeatures({
                    sendToAdmin: d.features.sendToAdmin === true,
                    bell: d.features.bell === true,
                    walkthroughs: d.features.walkthroughs === true,
                    voice: d.features.voice === true,
                });
                setAvailability(d?.available ? "ready" : d?.reason === "off" ? "off" : d?.reason === "not_set_up" ? "not_set_up" : "ready");
            })
            .catch(() => { /* leave unknown; the chat itself reports problems */ });
        return () => { cancelled = true; };
    }, [availability, setAvailability, setFeatures]);

    useEffect(() => {
        try { setTip(localStorage.getItem(TIP_KEY) !== "1"); } catch { setTip(false); }
    }, []);
    const dismissTip = () => {
        setTip(false);
        try { localStorage.setItem(TIP_KEY, "1"); } catch { /* counts as seen */ }
    };

    const openPanel = () => { dismissTip(); setOpen(true); setOpenCount(c => c + 1); };
    const closePanel = () => { setOpen(false); setDrag(0); setTimeout(() => launcherRef.current?.focus(), 0); };

    // Dialog behaviour: Escape closes, Tab stays inside, page scroll locked on phones.
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") { e.preventDefault(); closePanel(); return; }
            if (e.key !== "Tab" || !panelRef.current) return;
            const f = Array.from(panelRef.current.querySelectorAll<HTMLElement>(
                'button:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
            ));
            if (f.length === 0) return;
            const first = f[0], last = f[f.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        };
        window.addEventListener("keydown", onKey);
        const phone = window.matchMedia("(max-width: 767px)").matches;
        const prev = document.body.style.overflow;
        if (phone) document.body.style.overflow = "hidden";
        return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // A route change from inside the panel (Take me there) closes it; so does visiting /agent.
    useEffect(() => { if (onAgentPage && open) setOpen(false); }, [onAgentPage, open, setOpen]);

    // Phone sheet: drag the header down more than 80px to close.
    const headProps = {
        onPointerDown: (e: RPointerEvent<HTMLDivElement>) => {
            if (!window.matchMedia("(max-width: 767px)").matches) return;
            if ((e.target as HTMLElement).closest("button")) return;
            dragStart.current = e.clientY;
        },
        onPointerMove: (e: RPointerEvent<HTMLDivElement>) => {
            if (dragStart.current == null) return;
            setDrag(Math.max(0, e.clientY - dragStart.current));
        },
        onPointerUp: () => {
            if (dragStart.current == null) return;
            dragStart.current = null;
            if (drag > 80) closePanel(); else setDrag(0);
        },
    };

    if (!hydrated) return <Spotlight />;

    return (
        <>
            <Spotlight />
            {!onAgentPage && (
                <>
                    {!open && tip && availability !== "off" && availability !== "not_set_up" && (
                        <div className={`mtai-tip${onPos ? " on-pos" : ""}`} role="note">
                            <span className="mtai-eyebrow">New</span>
                            <span className="mtai-tip-title">Ask Miss Tokyo AI</span>
                            <p>Stock, sales and orders, or how to do anything in the dashboard.</p>
                            <button type="button" onClick={dismissTip}>Got it</button>
                        </div>
                    )}
                    {!open && (
                        <button
                            ref={launcherRef}
                            type="button"
                            className={`mtai-launcher${onPos ? " on-pos" : ""}`}
                            onClick={openPanel}
                            aria-label="Ask Miss Tokyo AI"
                            aria-haspopup="dialog"
                        >
                            <Spark size={22} />
                            <span className="mtai-launcher-label">Miss Tokyo AI</span>
                        </button>
                    )}
                    <div className={`mtai-scrim${open ? " open" : ""}`} onClick={closePanel} aria-hidden="true" />
                    <div
                        ref={panelRef}
                        className={`mtai-panel${open ? " open" : ""}`}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="mtai-title"
                        inert={!open}
                        style={drag ? ({ ["--mtai-drag" as string]: `${drag}px`, transition: "none" } as React.CSSProperties) : undefined}
                    >
                        <div className="mtai-grab" aria-hidden="true" />
                        <ChatSurface
                            user={user}
                            variant="panel"
                            onClose={closePanel}
                            onEffect={() => setOpen(false)}
                            focusKey={open ? openCount : 0}
                            headProps={headProps}
                        />
                    </div>
                </>
            )}
        </>
    );
}
