// Admin v2 motion helpers. CSS does the animating (admin-v2.css, "Motion");
// these only decide when. Nothing here waits before a save, a toast or a
// navigation: exits play on a detached copy after the caller has already
// closed, and view transitions never hold the route back.
//
// Every helper checks prefers-reduced-motion and then does nothing at all,
// so panels and modals close on the same frame.

/** Exit lengths, matching the keyframes in admin-v2.css. */
export const EXIT_MS = { panel: 170, modal: 150 } as const;
/** --stagger and the number of page children that get their own step. */
export const STAGGER_MS = 35;
export const STAGGER_CAP = 6;
/** How long a route's view transition may wait for the new page before it lets go. */
export const ROUTE_TRANSITION_CAP_MS = 350;
/** The theme cross-fade (html.theming). */
export const THEME_FADE_MS = 300;

/** Entrance delay of the i-th (0-based) child of a page: 35ms steps, the 6th and later share the last step. */
export function staggerDelayMs(i: number, step = STAGGER_MS, cap = STAGGER_CAP): number {
    if (!Number.isFinite(i) || i <= 0) return 0;
    return Math.min(Math.floor(i), cap - 1) * step;
}

/** The visible text of a React node, for keying a value so it re-animates when it changes. */
export function nodeText(n: unknown): string {
    if (n == null || typeof n === "boolean") return "";
    if (typeof n === "string" || typeof n === "number" || typeof n === "bigint") return String(n);
    if (Array.isArray(n)) return n.map(nodeText).join("");
    if (typeof n === "object" && "props" in n) return nodeText((n as { props?: { children?: unknown } }).props?.children);
    return "";
}

export function prefersReducedMotion(): boolean {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
}

// ── Exit on a detached copy ────────────────────────────────────────────────

/**
 * Called when an overlay goes away (its `open` turned false, or the caller
 * stopped rendering it). React has already removed the nodes; this puts the
 * same nodes back for one exit animation, inert and hidden from assistive
 * tech, and removes them when it ends. Scroll positions are restored so the
 * copy doesn't jump to the top while it slides out.
 */
export function playExit(nodes: HTMLElement[], parent: Node | null, ms: number, scrolls?: Map<Element, number>) {
    if (!parent || !nodes.length || prefersReducedMotion()) return;
    queueMicrotask(() => {
        // Still attached: StrictMode or Fast Refresh re-ran the effect without unmounting.
        if (nodes.some(n => n.isConnected) || !(parent as Element).isConnected) return;
        for (const n of nodes) {
            n.classList.add("closing");
            n.setAttribute("aria-hidden", "true");
            n.setAttribute("inert", "");
            parent.appendChild(n);
        }
        scrolls?.forEach((top, el) => { if (el.isConnected) el.scrollTop = top; });
        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            for (const n of nodes) { n.removeEventListener("animationend", onEnd); n.remove(); }
        };
        const onEnd = (e: AnimationEvent) => { if (e.animationName.endsWith("-out")) finish(); };
        const timer = setTimeout(finish, ms + 80);
        for (const n of nodes) n.addEventListener("animationend", onEnd);
    });
}

/** Remembers scroll offsets inside `nodes` so playExit can put them back. Returns the map and a stop function. */
export function trackScroll(nodes: HTMLElement[]): [Map<Element, number>, () => void] {
    const m = new Map<Element, number>();
    const h = (e: Event) => { const t = e.target; if (t instanceof Element) m.set(t, t.scrollTop); };
    for (const n of nodes) n.addEventListener("scroll", h, { capture: true, passive: true });
    return [m, () => { for (const n of nodes) n.removeEventListener("scroll", h, { capture: true }); }];
}

// ── Route view transitions ─────────────────────────────────────────────────

let commits = 0;
let release: (() => void) | null = null;

/** The shell calls this once the new route has rendered. */
export function signalRouteCommit() {
    commits++;
    const r = release;
    release = null;
    r?.();
}

function samePath(href: string): boolean {
    try { return new URL(href, window.location.href).pathname === window.location.pathname; } catch { return true; }
}

type VTDoc = Document & { startViewTransition?: (cb: () => Promise<void> | void) => unknown };

/**
 * Starts a cross-fade for a navigation the caller is about to make. The
 * navigation itself runs as normal (call this, then router.push or let the
 * Link continue). The fade waits for the new route to render, at most
 * ROUTE_TRANSITION_CAP_MS, then lets go whatever happened.
 */
export function startRouteTransition(href: string) {
    if (typeof document === "undefined") return;
    const d = document as VTDoc;
    if (typeof d.startViewTransition !== "function" || prefersReducedMotion() || samePath(href)) return;
    const before = commits;
    release?.();
    try {
        d.startViewTransition(() => new Promise<void>(resolve => {
            if (commits !== before) { resolve(); return; }
            const t = setTimeout(() => { if (release === go) release = null; resolve(); }, ROUTE_TRANSITION_CAP_MS);
            const go = () => { clearTimeout(t); resolve(); };
            release = go;
        }));
    } catch { /* the navigation goes ahead without the fade */ }
}
