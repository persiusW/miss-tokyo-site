// Shop wording (site_copy text blocks) and site images (site_assets) the
// admin can edit, with what the shop actually reads.

/** site_copy rows that hold settings or whole pages, not a line of wording.
 *  They have their own editors and never show in the Shop wording list. */
export const CONFIG_COPY_KEYS = ["size_guide_rows", "carousel_config", "wholesale_tiers", "homepage_layout", "homepage_reviews_source"] as const;
export const isConfigCopyKey = (k: string) => (CONFIG_COPY_KEYS as readonly string[]).includes(k) || k.startsWith("page_");

export type WordingDef = { key: string; label: string; group: string; hint?: string; original: string; path: string };

/** Wording the shop reads, with the text it shows when nothing is saved.
 *  A page's code takes its fallback from here, so "Use the original
 *  wording" always puts back exactly what customers saw. `path` is the page
 *  that shows it (refreshed when it is saved). */
export const WORDING: WordingDef[] = [
    { key: "home_new_arrivals_eyebrow", group: "homepage", label: "New arrivals small heading", hint: "The home page, above the New Arrivals title", original: "JUST LANDED", path: "/" },
    { key: "home_new_arrivals_link", group: "homepage", label: "New arrivals link", hint: "The home page, the link to the shop beside the New Arrivals title", original: "VIEW ALL", path: "/" },
    { key: "craft_heritage_heading", group: "craft", label: "Heritage heading", hint: "The Craft page, section 01", original: "The Name Is Personal", path: "/craft" },
    { key: "craft_heritage_body", group: "craft", label: "Heritage text", hint: "The Craft page, section 01", original: "MISS TOKYO is more than a label; it is a lineage. Born in Accra, our atelier honors the artisanal legacy of Ghana by refusing the shortcuts of mass production. Every stitch is a deliberate act of preservation.", path: "/craft" },
    { key: "craft_philosophy_heading", group: "craft", label: "Philosophy heading", hint: "The Craft page, section 02", original: "Visual Silence", path: "/craft" },
    { key: "craft_philosophy_body", group: "craft", label: "Philosophy text", hint: "The Craft page, section 02", original: "We strip away the extraneous to leave only the essential structure. True luxury is found in the quiet details: unbranded surfaces, perfectly skived edges, and leathers selected to age alongside you. Elegance is refusal.", path: "/craft" },
];

export const wordingOriginal = (key: string) => WORDING.find(w => w.key === key)?.original;

/** A saved value, or the original when nothing (or only spaces) is saved. */
export function wordingText(saved: Record<string, string | null | undefined>, key: string): string {
    const v = saved[key];
    return typeof v === "string" && v.trim() ? v : (wordingOriginal(key) ?? "");
}

/** Wording from the old site design that no page has a place for any more,
 *  and where the same text is edited now. Shown apart, so nobody edits text
 *  that customers never see. */
const ABOUT_NOW = "The About page's text is edited in Pages › About.";
const HERO_NOW = "The home page hero's text is edited in Home page › Hero slides.";
export const OLD_WORDING: Record<string, string> = {
    about_hero_title: ABOUT_NOW,
    about_founder_title: ABOUT_NOW,
    about_founder_p1: ABOUT_NOW,
    about_founder_p2: ABOUT_NOW,
    about_founder_p3: ABOUT_NOW,
    about_philosophy_quote: ABOUT_NOW,
    hero_title: HERO_NOW,
    hero_subtitle: HERO_NOW,
    hero_cta_text: HERO_NOW,
};

/** Why a piece of wording isn't on the shop (null when it is). */
export function wordingNote(key: string): string | null {
    if (WORDING.some(w => w.key === key)) return null;
    return OLD_WORDING[key] ?? "No shop page has a place for this wording.";
}

export const GROUP_LABELS: Record<string, string> = {
    homepage: "Home page",
    about: "About page",
    craft: "The Craft page",
    general: "Across the shop",
};

export type AssetDef = { key: string; label: string; group: string; used: boolean };

/** The image slots from the old Site Assets tab. `used` is whether a shop
 *  page reads the slot today; the others are kept for pages still to come. */
export const SITE_ASSETS: AssetDef[] = [
    { key: "home_hero", label: "Homepage hero", group: "Home page", used: false },
    { key: "shop_banner", label: "Shop page banner", group: "Shop", used: false },
    { key: "gift_card_hero", label: "Gift card image", group: "Gift cards", used: false },
    { key: "about_hero", label: "About hero image", group: "About", used: false },
    { key: "about_founder", label: "Founder photo", group: "About", used: false },
    { key: "craft_banner", label: "Craft page banner", group: "The Craft", used: false },
    { key: "craft_img_1", label: "Craft image 1", group: "The Craft", used: true },
    { key: "craft_img_2", label: "Craft image 2", group: "The Craft", used: true },
    { key: "craft_img_3", label: "Craft image 3", group: "The Craft", used: true },
    { key: "custom_banner", label: "Custom order banner", group: "Custom orders", used: false },
    { key: "gallery_banner", label: "Gallery banner", group: "Gallery", used: false },
];
