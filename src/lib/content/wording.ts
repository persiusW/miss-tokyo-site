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

export type AssetDef = {
    key: string; label: string; group: string;
    /** The page that shows the image, or null when no page has a place for it. */
    path: string | null;
    /** Where on that page, or why it isn't on the shop. */
    note: string;
    /** Whether tapping the image can go somewhere. Backgrounds can't. */
    linkable: boolean;
};

/** The image slots from the old Site Assets tab. Each shows only when an
 *  image is saved and switched on; with none, the page looks as it always did. */
export const SITE_ASSETS: AssetDef[] = [
    { key: "home_hero", label: "Homepage hero", group: "Home page", path: null, linkable: false, note: "The home page hero shows the images in Home page › Hero slides." },
    { key: "shop_banner", label: "Shop page banner", group: "Shop", path: "/shop", linkable: false, note: "Behind the “All Products” heading at the top of the shop, darkened so the heading stays readable." },
    { key: "gift_card_hero", label: "Gift card image", group: "Gift cards", path: "/gift-cards", linkable: false, note: "Behind the top of the gift cards page, darkened so the text stays readable." },
    { key: "about_hero", label: "About photo, tall", group: "About", path: "/about", linkable: true, note: "The tall photo on the left under “The Miss Tokyo Story”." },
    { key: "about_founder", label: "About photo, top right", group: "About", path: "/about", linkable: true, note: "The top-right photo under “The Miss Tokyo Story”." },
    { key: "about_photo_3", label: "About photo, bottom right", group: "About", path: "/about", linkable: true, note: "The bottom-right photo under “The Miss Tokyo Story”." },
    { key: "craft_banner", label: "Craft page banner", group: "The Craft", path: null, linkable: false, note: "The Craft page has no banner; its photos are Craft images 1 to 3." },
    { key: "craft_img_1", label: "Craft image 1", group: "The Craft", path: "/craft", linkable: true, note: "The first photo beside the Craft page's text." },
    { key: "craft_img_2", label: "Craft image 2", group: "The Craft", path: "/craft", linkable: true, note: "The second photo beside the Craft page's text." },
    { key: "craft_img_3", label: "Craft image 3", group: "The Craft", path: "/craft", linkable: true, note: "The third photo beside the Craft page's text." },
    { key: "custom_banner", label: "Custom order photo", group: "Custom orders", path: "/whitelabel", linkable: true, note: "Beside the form on the white labelling page, unless the customer came from a product." },
    { key: "gallery_banner", label: "Gallery banner", group: "Gallery", path: null, linkable: false, note: "The gallery is a full-screen video reel with no place for a banner." },
];

export type SiteImageRow = { section_key: string; image_url: string | null; alt_text: string | null; link_url: string | null; is_active: boolean | null };
export type ShownImage = { url: string; alt: string; link: string | null };

/** The image a page shows for a slot: saved, switched on and a secure address. */
export function shownImage(row: SiteImageRow | null | undefined): ShownImage | null {
    if (!row || row.is_active === false) return null;
    const url = (row.image_url ?? "").trim();
    if (!/^https:\/\//i.test(url)) return null;
    const link = (row.link_url ?? "").trim();
    return { url, alt: (row.alt_text ?? "").trim(), link: /^\/(?!\/)/.test(link) || /^https:\/\//i.test(link) ? link : null };
}
