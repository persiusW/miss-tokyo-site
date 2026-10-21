// Server-side loads for the Content pages. Service role (supabaseAdmin):
// pages on the anon client go silently empty after the RLS lockdown. A failed
// read returns null so the page can show "We couldn't load this".
/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase rows, normalised into typed shapes here */
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { HOME_LAYOUT_KEY, parseLayout, type HomeLayout } from "@/lib/content/homeLayout";
import { FAQ_COPY_KEY, POLICY_KEYS, POLICY_META, SIZE_GUIDE_PAGE_KEY, SIZE_MODAL_KEY, parseFaqs, parsePolicy, parseSizeGuidePage, type PolicyDoc, type PolicyKey, type SizeGuidePage } from "@/lib/content/pageDocs";
import { ABOUT_TEXT_KEYS, NAV_KEYS, PDP_KEYS, type AboutIn, type CarouselTab, type GiftCardSettingsIn, type ModalSizeRow, type NavKey, type PdpKey, type SeoIn, type TrustItem } from "@/lib/content/adminInput";
import { SITE_ASSETS, WORDING, isConfigCopyKey } from "@/lib/content/wording";
import { CAROUSEL_KEY, NEW_ARRIVALS_DEFAULT_LIMIT, NEW_ARRIVALS_DEFAULT_TITLE, parseCarouselTabs } from "@/lib/content/homeSections";
import type { Faq } from "@/content/shopInfo";
import { SEO_PATHS } from "./pagesList";

export type Slide = {
    id: string; position: number; enabled: boolean; eyebrow: string; headline_line1: string; headline_line2: string; headline_line3: string;
    body_text: string; cta_primary_label: string; cta_primary_url: string; cta_secondary_label: string; cta_secondary_url: string;
    image_url: string; overlay_opacity: number;
};
export type Category = { id: string; name: string; slug: string };
export type FeaturedSlot = { id: string | null; position: number; category_id: string | null; custom_label: string; item_count_override: number | null; enabled: boolean };

export type HomeData = {
    layout: HomeLayout;
    slides: Slide[];
    trustEnabled: boolean;
    trustItems: TrustItem[];
    categories: Category[];
    featured: FeaturedSlot[];
    newArrivals: { title: string; categoryId: string | null; limit: number; tabs: CarouselTab[] };
    newsletter: { enabled: boolean; title: string; subtitle: string; couponEnabled: boolean; couponCode: string; couponPct: number; subscribers: number };
    instagram: string | null;
};

const STR = ["eyebrow", "headline_line1", "headline_line2", "headline_line3", "body_text", "cta_primary_label", "cta_primary_url", "cta_secondary_label", "cta_secondary_url", "image_url"] as const;

export async function loadHome(): Promise<HomeData | null> {
    try {
        const [s, slides, cats, feat, copy, subs] = await Promise.all([
            supabaseAdmin.from("site_settings").select("trust_bar_enabled, trust_bar_items, homepage_new_arrivals_category_id, homepage_new_arrivals_title, homepage_new_arrivals_limit, optin_section_enabled, optin_title, optin_subtitle, welcome_coupon_enabled, welcome_coupon_code, welcome_coupon_percentage, social_instagram").eq("id", "singleton").maybeSingle(),
            supabaseAdmin.from("hero_slides").select("*").order("position", { ascending: true }),
            supabaseAdmin.from("categories").select("id, name, slug").eq("is_active", true).order("name"),
            supabaseAdmin.from("featured_categories").select("*").order("position"),
            supabaseAdmin.from("site_copy").select("copy_key, value").in("copy_key", [HOME_LAYOUT_KEY, "carousel_config"]),
            supabaseAdmin.from("newsletter_subscribers").select("id", { count: "exact", head: true }),
        ]);
        if (s.error || slides.error || cats.error || feat.error || copy.error) throw s.error ?? slides.error ?? cats.error ?? feat.error ?? copy.error;
        const st = (s.data ?? {}) as Record<string, any>;
        const cv = Object.fromEntries((copy.data ?? []).map((r: { copy_key: string; value: string }) => [r.copy_key, r.value]));
        const featured: FeaturedSlot[] = [0, 1, 2, 3].map(pos => {
            const f = (feat.data ?? []).find((x: { position: number }) => x.position === pos) as Record<string, any> | undefined;
            return f
                ? { id: f.id, position: pos, category_id: f.category_id ?? null, custom_label: f.custom_label ?? "", item_count_override: f.item_count_override ?? null, enabled: f.enabled ?? true }
                : { id: null, position: pos, category_id: null, custom_label: "", item_count_override: null, enabled: true };
        });
        return {
            layout: parseLayout(cv[HOME_LAYOUT_KEY]),
            slides: (slides.data ?? []).map((r: Record<string, any>) => {
                const out = { ...r } as Record<string, any>;
                for (const f of STR) if (out[f] == null) out[f] = "";
                return out as Slide;
            }),
            trustEnabled: st.trust_bar_enabled ?? false,
            trustItems: Array.isArray(st.trust_bar_items) ? st.trust_bar_items : [],
            categories: (cats.data ?? []) as Category[],
            featured,
            // Same fallbacks as the home page (lib/content/homeSections).
            newArrivals: {
                title: st.homepage_new_arrivals_title?.trim() || NEW_ARRIVALS_DEFAULT_TITLE,
                categoryId: st.homepage_new_arrivals_category_id ?? null,
                limit: st.homepage_new_arrivals_limit ?? NEW_ARRIVALS_DEFAULT_LIMIT,
                tabs: parseCarouselTabs(cv[CAROUSEL_KEY]),
            },
            newsletter: {
                // Same fallbacks as the home page itself.
                enabled: st.optin_section_enabled ?? true,
                title: st.optin_title ?? "",
                subtitle: st.optin_subtitle ?? "",
                couponEnabled: st.welcome_coupon_enabled ?? true,
                couponCode: st.welcome_coupon_code ?? "",
                couponPct: st.welcome_coupon_percentage ?? 10,
                subscribers: subs.count ?? 0,
            },
            instagram: st.social_instagram ?? null,
        };
    } catch (e) {
        console.error("[content] home load failed", e);
        return null;
    }
}

// ── Pages ────────────────────────────────────────────────────────────────────

export type PagesData = {
    about: AboutIn;
    policies: Record<PolicyKey, { doc: PolicyDoc; saved: boolean; updatedAt: string | null }>;
    faq: { items: Faq[]; saved: boolean; updatedAt: string | null };
    sizeGuide: { page: SizeGuidePage; modalRows: ModalSizeRow[]; updatedAt: string | null };
    giftCards: GiftCardSettingsIn;
    seo: Record<string, SeoIn & { updatedAt: string | null }>;
    pdp: Record<PdpKey, boolean>;
    settingsUpdatedAt: string | null;
};

const MODAL_DEFAULTS: ModalSizeRow[] = [
    { label: "XS — 6", bust: "80–83", waist: "62–65", hips: "88–91" },
    { label: "S — 8", bust: "84–87", waist: "66–69", hips: "92–95" },
    { label: "M — 10", bust: "88–91", waist: "70–73", hips: "96–99" },
    { label: "L — 12", bust: "92–96", waist: "74–78", hips: "100–104" },
    { label: "XL — 14", bust: "97–102", waist: "79–84", hips: "105–110" },
    { label: "XXL — 16", bust: "103–110", waist: "85–92", hips: "111–118" },
];

export async function loadPages(): Promise<PagesData | null> {
    try {
        const keys = [FAQ_COPY_KEY, SIZE_GUIDE_PAGE_KEY, SIZE_MODAL_KEY, ...POLICY_KEYS.map(k => POLICY_META[k].copyKey)];
        const [s, copy, meta] = await Promise.all([
            supabaseAdmin.from("site_settings").select("*").eq("id", "singleton").maybeSingle(),
            supabaseAdmin.from("site_copy").select("copy_key, value, updated_at").in("copy_key", keys),
            supabaseAdmin.from("site_metadata").select("page_path, title, description, keywords, og_image_url, updated_at").in("page_path", SEO_PATHS),
        ]);
        if (s.error || copy.error || meta.error) throw s.error ?? copy.error ?? meta.error;
        const st = (s.data ?? {}) as Record<string, any>;
        const row = (k: string) => (copy.data ?? []).find((r: { copy_key: string }) => r.copy_key === k) as { value: string; updated_at: string } | undefined;

        const about = {} as AboutIn;
        for (const k of ABOUT_TEXT_KEYS) about[k] = st[k] ?? "";
        about.about_timeline = st.about_timeline ?? [];
        about.about_values = st.about_values ?? [];
        about.about_team = (st.about_team ?? []).map((m: Record<string, any>) => ({ ...m, photo_url: m.photo_url ?? "" }));

        const policies = {} as PagesData["policies"];
        for (const k of POLICY_KEYS) {
            const r = row(POLICY_META[k].copyKey);
            policies[k] = { doc: parsePolicy(k, r?.value), saved: !!r, updatedAt: r?.updated_at ?? null };
        }
        let modalRows = MODAL_DEFAULTS;
        try { const p = JSON.parse(row(SIZE_MODAL_KEY)?.value ?? ""); if (Array.isArray(p) && p.length) modalRows = p; } catch { /* the pop-up's own defaults */ }
        const faqRow = row(FAQ_COPY_KEY);
        const sgRow = row(SIZE_GUIDE_PAGE_KEY);

        const seo: PagesData["seo"] = {};
        for (const p of SEO_PATHS) {
            const m = (meta.data ?? []).find((x: { page_path: string }) => x.page_path === p) as Record<string, any> | undefined;
            seo[p] = { title: m?.title ?? "", description: m?.description ?? "", keywords: m?.keywords ?? "", og_image_url: m?.og_image_url ?? "", updatedAt: m?.updated_at ?? null };
        }
        const pdp = {} as Record<PdpKey, boolean>;
        for (const k of PDP_KEYS) pdp[k] = st[k] ?? true;

        return {
            about,
            policies,
            faq: { items: parseFaqs(faqRow?.value), saved: !!faqRow, updatedAt: faqRow?.updated_at ?? null },
            sizeGuide: { page: parseSizeGuidePage(sgRow?.value), modalRows, updatedAt: sgRow?.updated_at ?? row(SIZE_MODAL_KEY)?.updated_at ?? null },
            giftCards: {
                gc_enabled: st.gc_enabled ?? true,
                gc_min_amount: Number(st.gc_min_amount ?? 20),
                gc_max_amount: Number(st.gc_max_amount ?? 500),
                gc_preset_amounts: (st.gc_preset_amounts as number[]) ?? [50, 100, 150, 200, 250, 300, 400, 500],
                gc_never_expires: st.gc_never_expires ?? true,
                gc_validity_days: Number(st.gc_validity_days ?? 365),
                gc_delivery_note: st.gc_delivery_note ?? "",
            },
            seo,
            pdp,
            settingsUpdatedAt: st.updated_at ?? null,
        };
    } catch (e) {
        console.error("[content] pages load failed", e);
        return null;
    }
}

// ── Menu ─────────────────────────────────────────────────────────────────────

export type MenuData = { nav: Record<NavKey, boolean>; pages: { gallery: boolean; giftCards: boolean } };

export async function loadMenu(): Promise<MenuData | null> {
    try {
        const [s, store] = await Promise.all([
            supabaseAdmin.from("site_settings").select(NAV_KEYS.join(", ")).eq("id", "singleton").maybeSingle(),
            supabaseAdmin.from("store_settings").select("enable_gallery, enable_gift_cards").eq("id", "default").maybeSingle(),
        ]);
        if (s.error || store.error) throw s.error ?? store.error;
        const st = (s.data ?? {}) as unknown as Record<string, boolean | null>;
        const nav = {} as Record<NavKey, boolean>;
        for (const k of NAV_KEYS) nav[k] = st[k] ?? true;
        return { nav, pages: { gallery: store.data?.enable_gallery !== false, giftCards: store.data?.enable_gift_cards !== false } };
    } catch (e) {
        console.error("[content] menu load failed", e);
        return null;
    }
}

// ── Reviews ──────────────────────────────────────────────────────────────────

export type Review = {
    id: string; position: number; enabled: boolean; reviewer_name: string; reviewer_location: string; avatar_initials: string;
    avatar_color: string; star_rating: number; review_text: string;
};

export async function loadReviews(): Promise<Review[] | null> {
    const { data, error } = await supabaseAdmin.from("homepage_reviews").select("*").order("position", { ascending: true });
    if (error) { console.error("[content] reviews load failed", error); return null; }
    return (data ?? []).map((r: Record<string, any>) => ({ ...r, reviewer_location: r.reviewer_location ?? "", avatar_initials: r.avatar_initials ?? "", review_text: r.review_text ?? "" })) as Review[];
}

// ── Shop wording and images ──────────────────────────────────────────────────

export type WordingRow = { key: string; label: string; group: string; hint: string | null; value: string; original: string | null; used: boolean; updatedAt: string | null };
export type ImageRow = { key: string; label: string; group: string; used: boolean; image_url: string; alt_text: string; link_url: string; is_active: boolean | null; updatedAt: string | null };

export async function loadWording(): Promise<{ wording: WordingRow[]; images: ImageRow[] } | null> {
    const [copy, assets] = await Promise.all([
        supabaseAdmin.from("site_copy").select("copy_key, label, page_group, value, hint, updated_at").order("page_group").order("copy_key"),
        supabaseAdmin.from("site_assets").select("*"),
    ]);
    if (copy.error || assets.error) { console.error("[content] wording load failed", copy.error ?? assets.error); return null; }
    const rows = (copy.data ?? []).filter((r: { copy_key: string }) => !isConfigCopyKey(r.copy_key)) as { copy_key: string; label: string; page_group: string; value: string; hint: string | null; updated_at: string }[];
    const wording: WordingRow[] = rows.map(r => {
        const def = WORDING.find(w => w.key === r.copy_key);
        return { key: r.copy_key, label: r.label || r.copy_key, group: r.page_group, hint: r.hint ?? def?.hint ?? null, value: r.value ?? "", original: def?.original ?? null, used: !!def, updatedAt: r.updated_at };
    });
    // Wording the shop reads but nobody has saved yet: shown with its original.
    for (const w of WORDING) {
        if (!wording.some(x => x.key === w.key)) wording.push({ key: w.key, label: w.label, group: w.group, hint: w.hint ?? null, value: w.original, original: w.original, used: true, updatedAt: null });
    }
    const images: ImageRow[] = SITE_ASSETS.map(a => {
        const r = (assets.data ?? []).find((x: { section_key: string }) => x.section_key === a.key) as Record<string, any> | undefined;
        return { ...a, image_url: r?.image_url ?? "", alt_text: r?.alt_text ?? "", link_url: r?.link_url ?? "", is_active: r ? r.is_active : null, updatedAt: r?.updated_at ?? null };
    });
    return { wording, images };
}
