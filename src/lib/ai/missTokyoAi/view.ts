// Which admin the person talking to Miss Tokyo AI is looking at. During the
// admin v2 rollout each area is either its old page or its new one
// (lib/admin/v2/routeMap.ts), so the guide, the routes, the Show me controls
// and the walkthroughs are picked per area. Computed on the server for every
// request; the prompt is a pure function of it, so caching still works (with
// everything on there is one stable prompt per role).
import { areaOn, type V2Area, type V2Flags } from "@/lib/admin/v2/routeMap";

export type { V2Area };

/** Every area, in the side menu's order. */
export const V2_AREAS: readonly V2Area[] = [
    "home", "inbox", "orders", "till", "products", "customers", "discounts", "content", "analytics", "staff", "billing", "settings",
];

export type AdminView = {
    /** Areas showing their new page, in V2_AREAS order. */
    areas: readonly V2Area[];
    /** The new side menu and top bar (store switch admin_v2, or this device previews it). */
    shell: boolean;
    /** This device previews the new admin while the store still uses the old one:
     *  its account menu has "Back to the old admin". */
    preview: boolean;
    /** store_settings.refunds_live: card and Mobile money refunds go through Paystack. */
    refundsLive: boolean;
};

export const OLD_VIEW: AdminView = { areas: [], shell: false, preview: false, refundsLive: false };

export function viewFromFlags(flags: V2Flags, opts: { preview?: boolean; refundsLive?: boolean } = {}): AdminView {
    const areas = V2_AREAS.filter(a => areaOn(a, flags));
    return { areas, shell: flags.admin_v2, preview: !!opts.preview && flags.admin_v2, refundsLive: !!opts.refundsLive };
}

/** The view as the browser reports it back (GET /api/ai/agent → client). Anything odd counts as the old admin. */
export function parseView(raw: unknown): AdminView {
    const r = (raw ?? {}) as Record<string, unknown>;
    const list = Array.isArray(r.areas) ? r.areas : [];
    return {
        areas: V2_AREAS.filter(a => list.includes(a)),
        shell: r.shell === true,
        preview: r.preview === true,
        refundsLive: r.refundsLive === true,
    };
}

export const isOn = (view: AdminView, area: V2Area | null | undefined): boolean => !!area && view.areas.includes(area);

/** Stable text for the view, for logs and tests. */
export const viewKey = (v: AdminView): string =>
    `${v.shell ? "shell" : "old-shell"}|${v.areas.join(",") || "none"}|${v.preview ? "preview" : "store"}|${v.refundsLive ? "refunds-live" : "refunds-record"}`;
