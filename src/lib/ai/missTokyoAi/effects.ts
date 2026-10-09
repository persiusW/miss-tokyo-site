// Effects: what a reply asks the panel to offer as buttons. Tools never act on
// their own — the person taps the button. Every effect is validated here
// before it leaves the server.
import { ANCHORS, type AnchorId } from "@/lib/ai/missTokyoAi/anchors";
import { ROUTES, routeAllowed, type RouteKey, type StaffRole } from "@/lib/ai/missTokyoAi/routes";

export type Effect =
    | { kind: "navigate"; route: RouteKey; href: string; label: string }
    | { kind: "show_me"; anchor: AnchorId; href: string; label: string };

/** Builds a navigate effect, or null if the route/tab is unknown or not allowed for the role. */
export function navigateEffect(routeKey: string, role: StaffRole, tab?: string | null): Effect | null {
    const route: { path: string; title: string; tabs?: readonly string[] } | undefined = ROUTES[routeKey as RouteKey];
    if (!route || !routeAllowed(routeKey as RouteKey, role)) return null;
    let href = route.path;
    if (tab) {
        if (!route.tabs?.includes(tab)) return null;
        href = `${route.path}?tab=${encodeURIComponent(tab)}`;
    }
    return { kind: "navigate", route: routeKey as RouteKey, href, label: `Open ${route.title}` };
}

export function showMeEffect(anchorId: string, role: StaffRole): Effect | null {
    const anchor: { route: RouteKey; label: string; tab?: string } | undefined = ANCHORS[anchorId as AnchorId];
    if (!anchor || !routeAllowed(anchor.route, role)) return null;
    const route = ROUTES[anchor.route];
    const href = anchor.tab ? `${route.path}?tab=${encodeURIComponent(anchor.tab)}` : route.path;
    return { kind: "show_me", anchor: anchorId as AnchorId, href, label: "Show me" };
}
