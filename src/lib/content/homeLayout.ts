// The order of the home page's sections, and which are hidden.
//
// Kept in site_copy under "homepage_layout" as {"order": [...], "hidden": [...]}.
// The promise strip and the newsletter sign-up keep their own switches
// (site_settings.trust_bar_enabled / optin_section_enabled); "hidden" only
// covers sections that had no switch before. No saved value means today's
// order with everything showing.

export const HOME_LAYOUT_KEY = "homepage_layout";

export type HomeSectionId = "hero" | "trust" | "categories" | "new_arrivals" | "reviews" | "newsletter" | "instagram";

export const HOME_SECTIONS: { id: HomeSectionId; name: string }[] = [
    { id: "hero", name: "Hero slides" },
    { id: "trust", name: "Promise strip" },
    { id: "categories", name: "Featured categories" },
    { id: "new_arrivals", name: "New arrivals" },
    { id: "reviews", name: "Customer reviews" },
    { id: "newsletter", name: "Newsletter sign-up" },
    { id: "instagram", name: "Instagram posts" },
];

/** Sections whose switch lives in site_settings, not in the layout. */
export const OWN_SWITCH: Partial<Record<HomeSectionId, "trust_bar_enabled" | "optin_section_enabled">> = {
    trust: "trust_bar_enabled",
    newsletter: "optin_section_enabled",
};

/** How many products the home page's New Arrivals carousel shows (newest first). */
export const NEW_ARRIVALS_SHOWN = 16;

export type HomeLayout = { order: HomeSectionId[]; hidden: HomeSectionId[] };

const IDS = HOME_SECTIONS.map(s => s.id);
const isId = (v: unknown): v is HomeSectionId => typeof v === "string" && (IDS as string[]).includes(v);

export const DEFAULT_LAYOUT: HomeLayout = { order: [...IDS], hidden: [] };

/** Unknown ids are dropped; missing ones go back in their usual place. */
export function cleanLayout(v: unknown): HomeLayout {
    const o = (v && typeof v === "object" ? v : {}) as { order?: unknown; hidden?: unknown };
    const order = [...new Set((Array.isArray(o.order) ? o.order : []).filter(isId))];
    for (const id of IDS) {
        if (order.includes(id)) continue;
        // Straight after the section it usually follows, else first.
        const prev = IDS.slice(0, IDS.indexOf(id)).reverse().find(x => order.includes(x));
        order.splice(prev ? order.indexOf(prev) + 1 : 0, 0, id);
    }
    const hidden = [...new Set((Array.isArray(o.hidden) ? o.hidden : []).filter(isId))].filter(id => !OWN_SWITCH[id]);
    return { order, hidden };
}

export function parseLayout(raw: string | null | undefined): HomeLayout {
    if (!raw) return DEFAULT_LAYOUT;
    try { return cleanLayout(JSON.parse(raw)); } catch { return DEFAULT_LAYOUT; }
}
