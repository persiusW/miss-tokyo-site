// Effects: what a reply asks the panel to offer as buttons. Tools never act on
// their own — the person taps the button. Every effect is validated here
// before it leaves the server, against the admin this person is looking at.
import { anchorFor, type AnchorId } from "@/lib/ai/missTokyoAi/anchors";
import { findRoute, routeAllowed, routeHref, type StaffRole } from "@/lib/ai/missTokyoAi/routes";
import { cleanQuestion } from "@/lib/ai/missTokyoAi/questions";
import { findWalkthrough } from "@/lib/ai/missTokyoAi/walkthroughs";
import { OLD_VIEW, type AdminView } from "@/lib/ai/missTokyoAi/view";

export type Effect =
    | { kind: "navigate"; route: string; href: string; label: string }
    | { kind: "show_me"; anchor: AnchorId; href: string; label: string }
    /** Starts a step-by-step tour on its first step's page. */
    | { kind: "walkthrough"; id: string; href: string; label: string }
    /** Offers to send the question to the admin inbox. Nothing is sent until the person taps it. */
    | { kind: "send_to_admin"; summary: string }
    /** Admin only: the SQL a reporting_query ran, shown under the reply. Not a button. */
    | { kind: "query"; sql: string; rows: number };

export type ButtonEffect = Extract<Effect, { href: string }>;

/** Builds a navigate effect, or null if the route/tab is unknown, not in this view or not allowed for the role. */
export function navigateEffect(routeKey: string, role: StaffRole, tab?: string | null, view: AdminView = OLD_VIEW): ButtonEffect | null {
    const route = findRoute(routeKey, view);
    if (!route || !routeAllowed(routeKey, role, view)) return null;
    const href = routeHref(route, tab);
    if (!href) return null;
    return { kind: "navigate", route: routeKey, href, label: `Open ${route.title}` };
}

export function showMeEffect(anchorId: string, role: StaffRole, view: AdminView = OLD_VIEW): ButtonEffect | null {
    const anchor = anchorFor(anchorId, view);
    if (!anchor || anchor.orderPage || !routeAllowed(anchor.route, role, view)) return null;
    const href = routeHref(findRoute(anchor.route, view)!, anchor.tab);
    if (!href) return null;
    return { kind: "show_me", anchor: anchorId as AnchorId, href, label: "Show me" };
}

export function sendToAdminEffect(summary: unknown): Effect | null {
    const clean = cleanQuestion(summary);
    return clean.length >= 5 ? { kind: "send_to_admin", summary: clean } : null;
}

export function walkthroughEffect(id: unknown, role: StaffRole, view: AdminView = OLD_VIEW): ButtonEffect | null {
    const w = typeof id === "string" ? findWalkthrough(id, role, view) : null;
    if (!w) return null;
    const first = w.steps[0];
    const route = findRoute(first.route, view);
    if (!route || !routeAllowed(first.route, role, view)) return null;
    return { kind: "walkthrough", id: w.id, href: route.path, label: "Start walkthrough" };
}
