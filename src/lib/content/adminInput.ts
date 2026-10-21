// Cleans what the Content editor sends before it is written. Server actions
// are public endpoints, so nothing from the browser is trusted as-is: unknown
// keys are dropped, text is trimmed and capped, numbers are bounded.
import type { AboutTeamMember, AboutTimelineEntry, AboutValue } from "@/types/settings";

const s = (v: unknown, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const n = (v: unknown, lo: number, hi: number, dflt: number) => {
    const x = Number(v);
    return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : dflt;
};
const b = (v: unknown, dflt = false) => (typeof v === "boolean" ? v : dflt);
const HEX = /^#[0-9a-f]{6}$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

/** A link a button may point at: a shop path or a secure web address. */
export function cleanLink(v: unknown): string {
    const t = s(v, 500);
    if (!t) return "";
    if (/^\/(?!\/)/.test(t) || /^https:\/\//i.test(t)) return t;
    return "";
}

/** An image the uploader stored, or nothing. */
export function cleanImage(v: unknown): string {
    const t = s(v, 1000);
    return /^https:\/\//i.test(t) ? t : "";
}

export type SlideIn = {
    id?: string; enabled: boolean; eyebrow: string; headline_line1: string; headline_line2: string; headline_line3: string;
    body_text: string; cta_primary_label: string; cta_primary_url: string; cta_secondary_label: string; cta_secondary_url: string;
    image_url: string; overlay_opacity: number;
};

export function cleanSlide(v: unknown): SlideIn | null {
    const o = (v ?? {}) as Record<string, unknown>;
    const headline = s(o.headline_line1, 200);
    if (!headline) return null;
    return {
        ...(isUuid(o.id) ? { id: o.id } : {}),
        enabled: b(o.enabled, true),
        eyebrow: s(o.eyebrow, 120),
        headline_line1: headline,
        headline_line2: s(o.headline_line2, 200),
        headline_line3: s(o.headline_line3, 200),
        body_text: s(o.body_text, 600),
        cta_primary_label: s(o.cta_primary_label, 60) || "Shop Now",
        cta_primary_url: cleanLink(o.cta_primary_url) || "/shop",
        cta_secondary_label: s(o.cta_secondary_label, 60),
        cta_secondary_url: cleanLink(o.cta_secondary_url),
        image_url: cleanImage(o.image_url),
        overlay_opacity: Math.round(n(o.overlay_opacity, 0, 1, 0.45) * 100) / 100,
    };
}

export type ReviewIn = {
    id?: string; enabled: boolean; reviewer_name: string; reviewer_location: string; avatar_initials: string;
    avatar_color: string; star_rating: number; review_text: string;
};

export function cleanReview(v: unknown): ReviewIn | null {
    const o = (v ?? {}) as Record<string, unknown>;
    const name = s(o.reviewer_name, 120);
    if (!name) return null;
    const color = s(o.avatar_color, 7);
    return {
        ...(isUuid(o.id) ? { id: o.id } : {}),
        enabled: b(o.enabled, true),
        reviewer_name: name,
        reviewer_location: s(o.reviewer_location, 120),
        avatar_initials: s(o.avatar_initials, 2).toUpperCase(),
        avatar_color: HEX.test(color) ? color : "#C4896A",
        star_rating: Math.round(n(o.star_rating, 1, 5, 5)),
        review_text: s(o.review_text, 2000),
    };
}

export type TrustItem = { id: string; text: string; enabled: boolean };
export function cleanTrustItems(v: unknown): TrustItem[] {
    return (Array.isArray(v) ? v : []).slice(0, 20)
        .map(x => ({ id: s((x as TrustItem)?.id, 60) || crypto.randomUUID(), text: s((x as TrustItem)?.text, 160), enabled: b((x as TrustItem)?.enabled, true) }))
        .filter(x => x.text);
}

export type FeaturedSlotIn = { id: string | null; position: number; category_id: string | null; custom_label: string | null; item_count_override: number | null; enabled: boolean };
export function cleanFeatured(v: unknown): FeaturedSlotIn[] {
    return (Array.isArray(v) ? v : []).slice(0, 4).map((x, i) => {
        const o = (x ?? {}) as Record<string, unknown>;
        const count = o.item_count_override == null || o.item_count_override === "" ? null : Math.round(n(o.item_count_override, 1, 9999, 1));
        return {
            id: isUuid(o.id) ? o.id : null,
            position: i,
            category_id: isUuid(o.category_id) ? o.category_id : null,
            custom_label: s(o.custom_label, 80) || null,
            item_count_override: count,
            enabled: b(o.enabled, true),
        };
    });
}

export type CarouselTab = { label: string; mode: "newest" | "sort_order"; category_name: string };
export function cleanCarouselTabs(v: unknown): CarouselTab[] {
    return (Array.isArray(v) ? v : []).slice(0, 4).map(x => {
        const o = (x ?? {}) as Record<string, unknown>;
        return { label: s(o.label, 40), mode: o.mode === "sort_order" ? "sort_order" : "newest", category_name: s(o.category_name, 120) } as CarouselTab;
    });
}

export type SeoIn = { title: string; description: string; keywords: string; og_image_url: string };
export function cleanSeo(v: unknown): SeoIn {
    const o = (v ?? {}) as Record<string, unknown>;
    return { title: s(o.title, 120), description: s(o.description, 320), keywords: s(o.keywords, 300), og_image_url: cleanImage(o.og_image_url) };
}

/** The About page fields AboutPageTab saved, and nothing else. */
export const ABOUT_TEXT_KEYS = [
    "about_eyebrow", "about_headline_line1", "about_headline_line2", "about_manifesto_p1", "about_manifesto_p2", "about_manifesto_p3",
    "about_stat_1_value", "about_stat_1_label", "about_stat_2_value", "about_stat_2_label", "about_stat_3_value", "about_stat_3_label",
    "about_story_heading", "about_story_p1", "about_story_p2", "about_quote_text", "about_quote_author",
    "about_cta_eyebrow", "about_cta_headline", "about_cta_body", "about_cta_btn_label", "about_cta_btn_url",
] as const;
export type AboutTextKey = (typeof ABOUT_TEXT_KEYS)[number];

export const ABOUT_ICONS = ["heart", "shield", "users", "globe", "message", "trending-up", "star", "zap", "award", "check-circle"] as const;

export type AboutIn = Record<AboutTextKey, string> & { about_timeline: AboutTimelineEntry[]; about_values: AboutValue[]; about_team: AboutTeamMember[] };

export function cleanAbout(v: unknown): AboutIn {
    const o = (v ?? {}) as Record<string, unknown>;
    const out = {} as AboutIn;
    for (const k of ABOUT_TEXT_KEYS) out[k] = k === "about_cta_btn_url" ? (cleanLink(o[k]) || "/shop") : s(o[k], 3000);
    out.about_timeline = (Array.isArray(o.about_timeline) ? o.about_timeline : []).slice(0, 30)
        .map(e => ({ year: s((e as AboutTimelineEntry)?.year, 20), title: s((e as AboutTimelineEntry)?.title, 200), body: s((e as AboutTimelineEntry)?.body, 2000) }))
        .filter(e => e.year || e.title || e.body);
    out.about_values = (Array.isArray(o.about_values) ? o.about_values : []).slice(0, 20)
        .map(e => {
            const icon = s((e as AboutValue)?.icon, 30);
            return { icon: (ABOUT_ICONS as readonly string[]).includes(icon) ? icon : "heart", title: s((e as AboutValue)?.title, 200), body: s((e as AboutValue)?.body, 2000) };
        })
        .filter(e => e.title || e.body);
    out.about_team = (Array.isArray(o.about_team) ? o.about_team : []).slice(0, 30)
        .map(e => {
            const m = (e ?? {}) as AboutTeamMember;
            const color = s(m.avatar_color, 7);
            return { name: s(m.name, 120), role: s(m.role, 120), bio: s(m.bio, 2000), avatar_color: HEX.test(color) ? color : "#1a1a1a", photo_url: cleanImage(m.photo_url) };
        })
        .filter(m => m.name);
    return out;
}

export type GiftCardSettingsIn = {
    gc_enabled: boolean; gc_min_amount: number; gc_max_amount: number; gc_preset_amounts: number[];
    gc_never_expires: boolean; gc_validity_days: number; gc_delivery_note: string;
};

export function cleanGiftCards(v: unknown): GiftCardSettingsIn | null {
    const o = (v ?? {}) as Record<string, unknown>;
    const min = n(o.gc_min_amount, 1, 100000, 20);
    const max = n(o.gc_max_amount, 1, 100000, 500);
    if (min > max) return null;
    const presets = [...new Set((Array.isArray(o.gc_preset_amounts) ? o.gc_preset_amounts : []).map(Number).filter(x => Number.isFinite(x) && x > 0 && x <= 100000))]
        .sort((a, b2) => a - b2).slice(0, 20);
    return {
        gc_enabled: b(o.gc_enabled, true),
        gc_min_amount: min,
        gc_max_amount: max,
        gc_preset_amounts: presets,
        gc_never_expires: b(o.gc_never_expires, true),
        gc_validity_days: Math.round(n(o.gc_validity_days, 1, 3650, 365)),
        gc_delivery_note: s(o.gc_delivery_note, 600),
    };
}

export type ModalSizeRow = { label: string; bust: string; waist: string; hips: string };
export function cleanModalRows(v: unknown): ModalSizeRow[] {
    return (Array.isArray(v) ? v : []).slice(0, 40)
        .map(r => ({ label: s((r as ModalSizeRow)?.label, 60), bust: s((r as ModalSizeRow)?.bust, 40), waist: s((r as ModalSizeRow)?.waist, 40), hips: s((r as ModalSizeRow)?.hips, 40) }))
        .filter(r => r.label);
}

export const NAV_KEYS = [
    "nav_show_home", "nav_show_shop", "nav_show_gallery", "nav_show_sale", "nav_show_dresses",
    "nav_show_new_arrivals", "nav_show_gift_card", "nav_show_contact", "nav_show_about",
] as const;
export type NavKey = (typeof NAV_KEYS)[number];

export const PDP_KEYS = ["pdp_show_trust_strip", "pdp_show_product_details", "pdp_show_care_instructions", "pdp_show_delivery_returns", "pdp_show_reviews"] as const;
export type PdpKey = (typeof PDP_KEYS)[number];
