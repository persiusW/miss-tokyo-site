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
