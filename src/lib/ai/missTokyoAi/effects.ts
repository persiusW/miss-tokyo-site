// Effects: what a reply asks the panel to offer as buttons. Tools never act on
// their own — the person taps the button. Every effect is validated here
// before it leaves the server.
import { ANCHORS, type AnchorId } from "@/lib/ai/missTokyoAi/anchors";
import { ROUTES, routeAllowed, type RouteKey, type StaffRole } from "@/lib/ai/missTokyoAi/routes";
import { cleanQuestion } from "@/lib/ai/missTokyoAi/questions";
import { findWalkthrough } from "@/lib/ai/missTokyoAi/walkthroughs";

export type Effect =
    | { kind: "navigate"; route: RouteKey; href: string; label: string }
    | { kind: "show_me"; anchor: AnchorId; href: string; label: string }
    /** Starts a step-by-step tour on its first step's page. */
    | { kind: "walkthrough"; id: string; href: string; label: string }
    /** Offers to send the question to the admin inbox. Nothing is sent until the person taps it. */
    | { kind: "send_to_admin"; summary: string }
    /** Admin only: the SQL a reporting_query ran, shown under the reply. Not a button. */
    | { kind: "query"; sql: string; rows: number };

export type ButtonEffect = Extract<Effect, { href: string }>;

/** Builds a navigate effect, or null if the route/tab is unknown or not allowed for the role. */
export function navigateEffect(routeKey: string, role: StaffRole, tab?: string | null): ButtonEffect | null {
    const route: { path: string; title: string; tabs?: readonly string[] } | undefined = ROUTES[routeKey as RouteKey];
    if (!route || !routeAllowed(routeKey as RouteKey, role)) return null;
    let href = route.path;
    if (tab) {
        if (!route.tabs?.includes(tab)) return null;
        href = `${route.path}?tab=${encodeURIComponent(tab)}`;
    }
    return { kind: "navigate", route: routeKey as RouteKey, href, label: `Open ${route.title}` };
}

export function showMeEffect(anchorId: string, role: StaffRole): ButtonEffect | null {
    const anchor: { route: RouteKey; label: string; tab?: string } | undefined = ANCHORS[anchorId as AnchorId];
    if (!anchor || !routeAllowed(anchor.route, role)) return null;
    const route = ROUTES[anchor.route];
    const href = anchor.tab ? `${route.path}?tab=${encodeURIComponent(anchor.tab)}` : route.path;
    return { kind: "show_me", anchor: anchorId as AnchorId, href, label: "Show me" };
}

export function sendToAdminEffect(summary: unknown): Effect | null {
    const clean = cleanQuestion(summary);
    return clean.length >= 5 ? { kind: "send_to_admin", summary: clean } : null;
}

export function walkthroughEffect(id: unknown, role: StaffRole): ButtonEffect | null {
    const w = typeof id === "string" ? findWalkthrough(id, role) : null;
    if (!w) return null;
    const first = w.steps[0];
    if (!routeAllowed(first.route, role)) return null;
    return { kind: "walkthrough", id: w.id, href: ROUTES[first.route].path, label: "Start walkthrough" };
}
