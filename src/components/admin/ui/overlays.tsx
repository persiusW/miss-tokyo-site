"use client";

// Panels, modals and menus. Esc closes the top-most layer only, focus is
// trapped inside it and returns to the opener on close.
//
// Closing never waits: onClose runs at once (so saves, toasts and focus
// return are never held back) and useExit plays the slide-out on the nodes
// React just removed. That covers every way an overlay goes away: Esc, the
// scrim, the close button, a footer Cancel, a save that closes it, the
// caller unmounting it, or a route change.
//
// Overlays portal into the .adm2 root, never <body>: the tokens are declared
// there, and the top bar's backdrop-filter would otherwise trap position:fixed
// (see memory: fixed-position traps in the admin shell).
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Icon, type IconName } from "./Icon";
import { Banner, Btn, IconBtn, Tabs, type TabDef } from "./primitives";
import { EXIT_MS, playExit, trackScroll } from "./motion";

const layerStack: object[] = [];

export function portalHost(): Element | null {
    if (typeof document === "undefined") return null;
    return document.querySelector(".adm2") ?? document.body;
}

export function useLayer(open: boolean, onClose: () => void, ref: RefObject<HTMLElement | null>) {
    const onCloseRef = useRef(onClose);
    useEffect(() => { onCloseRef.current = onClose; });
    useEffect(() => {
        if (!open) return;
        const opener = document.activeElement as HTMLElement | null;
        const me = {};
        layerStack.push(me);
        const t = setTimeout(() => {
            const el = ref.current?.querySelector<HTMLElement>("[data-autofocus]")
                || ref.current?.querySelector<HTMLElement>(".panel-body input,.panel-body select,.panel-body textarea,.modal-b input,.modal-b textarea,.modal-b select")
                || ref.current?.querySelector<HTMLElement>("button,input,select,textarea,[tabindex]");
            el?.focus();
        }, 30);
        const onKey = (e: KeyboardEvent) => {
            const top = layerStack[layerStack.length - 1] === me;
            if (!top) return;
            if (e.key === "Escape") { e.preventDefault(); onCloseRef.current(); }
            if (e.key === "Tab" && ref.current) {
                const f = [...ref.current.querySelectorAll<HTMLElement>("button:not([disabled]),input:not([disabled]),select,textarea,a[href],[tabindex='0']")]
                    .filter(x => x.offsetParent !== null);
                if (!f.length) return;
                const a = f[0], b = f[f.length - 1];
                if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus(); }
                else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus(); }
            }
        };
        window.addEventListener("keydown", onKey);
        return () => {
            clearTimeout(t);
            window.removeEventListener("keydown", onKey);
            const i = layerStack.indexOf(me);
            if (i > -1) layerStack.splice(i, 1);
            if (opener && document.contains(opener)) opener.focus();
        };
    }, [open, ref]);
}

/**
 * Plays the exit animation once this overlay goes away: `active` turning
 * false, or the component unmounting. `a` and `b` are its top-level nodes
 * (scrim first, so the panel stays on top). Skipped under reduced motion.
 */
export function useExit(active: boolean, ms: number, a: RefObject<HTMLElement | null>, b?: RefObject<HTMLElement | null>) {
    useLayoutEffect(() => {
        if (!active) return;
        const nodes = [a.current, b?.current].filter((n): n is HTMLElement => !!n);
        const parent = nodes[0]?.parentNode ?? null;
        const [scrolls, stop] = trackScroll(nodes);
        return () => { stop(); playExit(nodes, parent, ms, scrolls); };
    }, [active, ms, a, b]);
}

function useMounted() {
    const [m, setM] = useState(false);
    useEffect(() => setM(true), []);
    return m;
}

type PanelProps<T extends string> = {
    open: boolean;
    onClose: () => void;
    title: ReactNode;
    sub?: ReactNode;
    head?: ReactNode;
    tabs?: TabDef<T>[] | null;
    tab?: T;
    onTab?: (t: T) => void;
    children: ReactNode;
    footer?: ReactNode;
    footerLeft?: ReactNode;
    wide?: boolean;
    level?: 1 | 2;
    label?: string;
};

/** Right-hand drawer for every create and edit flow. Under 620px it's a full-height sheet. */
export function Panel<T extends string>({ open, onClose, title, sub, head, tabs, tab, onTab, children, footer, footerLeft, wide, level, label }: PanelProps<T>) {
    const ref = useRef<HTMLElement>(null);
    const scrimRef = useRef<HTMLDivElement>(null);
    useLayer(open, onClose, ref);
    const mounted = useMounted();
    const host = mounted ? portalHost() : null;
    useExit(open && !!host, EXIT_MS.panel, scrimRef, ref);
    if (!open || !host) return null;
    const lv = level === 2 ? " stack-2" : "";
    return createPortal(
        <>
            <div className={"scrim" + lv} onClick={onClose} ref={scrimRef} />
            <aside className={`panel${wide ? " wide" : ""}${lv}`} role="dialog" aria-modal="true"
                aria-label={label ?? (typeof title === "string" ? title : "Panel")} ref={ref}>
                <div className="panel-h">
                    <div className="grow">{head}<h2>{title}</h2>{sub && <div className="panel-sub">{sub}</div>}</div>
                    <IconBtn label="Close" icon="x" onClick={onClose} />
                </div>
                {tabs && tab != null && <Tabs tabs={tabs} value={tab} onChange={onTab} label="Panel sections" />}
                <div className="panel-body">{children}</div>
                {(footer || footerLeft) && <div className="panel-f"><div className="left">{footerLeft}</div>{footer}</div>}
            </aside>
        </>,
        host,
    );
}

/** Centred dialog, only for short single-purpose steps. */
export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
    const ref = useRef<HTMLDivElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    useLayer(open, onClose, ref);
    const mounted = useMounted();
    const host = mounted ? portalHost() : null;
    useExit(open && !!host, EXIT_MS.modal, wrapRef);
    if (!open || !host) return null;
    return createPortal(
        <div className="modal-wrap" ref={wrapRef}>
            <div className="scrim" onClick={onClose} />
            <div className={`modal${wide ? " wide" : ""}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
                <div className="modal-h"><h2>{title}</h2></div>
                <div className="modal-b">{children}</div>
                {footer && <div className="modal-f">{footer}</div>}
            </div>
        </div>,
        host,
    );
}

export type MenuItem = { l: string; icon?: IconName; onClick: () => void; danger?: boolean; disabled?: boolean } | "-";

export function Menu({ label = "More actions", items, up, left, trigger }: { label?: string; items: MenuItem[]; up?: boolean; left?: boolean; trigger?: (toggle: () => void, open: boolean) => ReactNode }) {
    const [o, setO] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!o) return;
        const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setO(false); };
        const k = (e: KeyboardEvent) => {
            if (e.key === "Escape") { e.stopPropagation(); setO(false); }
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                const bs = [...(ref.current?.querySelectorAll<HTMLElement>("[role=menuitem]:not([disabled])") ?? [])];
                const i = bs.indexOf(document.activeElement as HTMLElement);
                bs[(i + (e.key === "ArrowDown" ? 1 : -1) + bs.length) % bs.length]?.focus();
            }
        };
        document.addEventListener("mousedown", h);
        document.addEventListener("keydown", k, true);
        setTimeout(() => ref.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus(), 0);
        return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k, true); };
    }, [o]);
    return (
        <div className="menu-wrap" ref={ref}>
            {trigger ? trigger(() => setO(!o), o)
                : <IconBtn label={label} icon="more" aria-haspopup="menu" aria-expanded={o} onClick={() => setO(!o)} />}
            {o && (
                <div className={`menu${up ? " up" : ""}${left ? " left" : ""}`} role="menu">
                    {items.map((it, i) => it === "-" ? <hr key={i} /> : (
                        <button key={i} role="menuitem" type="button" disabled={it.disabled} className={it.danger ? "danger" : ""}
                            onClick={() => { setO(false); it.onClick(); }}>
                            {it.icon && <Icon n={it.icon} style={{ width: 16, height: 16 }} />}{it.l}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/** For anything that moves money or stock: the consequence in one banner, and a danger-solid primary. */
export function ConfirmPanel({ open, onClose, title, sub, consequenceTitle, consequence, tone = "danger", confirmLabel, cancelLabel = "Cancel", onConfirm, busy, children, level, confirmDisabled }: {
    open: boolean; onClose: () => void; title: string; sub?: ReactNode; consequenceTitle: ReactNode; consequence: ReactNode;
    tone?: "danger" | "warn"; confirmLabel: string; cancelLabel?: string; onConfirm: () => void; busy?: boolean; children?: ReactNode; level?: 1 | 2;
    /** Holds the primary back until the form inside is complete (e.g. the cash received covers the total). */
    confirmDisabled?: boolean;
}) {
    return (
        <Panel open={open} onClose={onClose} title={title} sub={sub} level={level}
            footer={<><Btn kind="ghost" onClick={onClose} disabled={busy}>{cancelLabel}</Btn><Btn kind="danger-solid" onClick={onConfirm} disabled={busy || confirmDisabled}>{busy ? "Working…" : confirmLabel}</Btn></>}>
            {children}
            <Banner tone={tone} title={consequenceTitle}>{consequence}</Banner>
        </Panel>
    );
}
