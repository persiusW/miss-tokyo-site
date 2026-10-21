// Server-side reads of the editable shop pages, for the storefront and for
// Ask Miss Tokyo. A failed read shows the original text, never an empty page.
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { FAQ_COPY_KEY, POLICY_META, SIZE_GUIDE_PAGE_KEY, parseFaqs, parsePolicy, parseSizeGuidePage, type PolicyKey } from "./pageDocs";
import type { ShopContent } from "./shopInfoText";
import { shownImage, type ShownImage, type SiteImageRow } from "./wording";
import { withSeoRow } from "./seo";

/** Cache tags: Content's saves expire them so the shop updates at once. */
export const PAGE_SEO_TAG = "page-seo";
export const SITE_IMAGES_TAG = "site-images";

async function copyValues(keys: string[]): Promise<Record<string, string>> {
    try {
        const { data } = await supabaseAdmin.from("site_copy").select("copy_key, value").in("copy_key", keys);
        return Object.fromEntries((data ?? []).map((r: { copy_key: string; value: string }) => [r.copy_key, r.value]));
    } catch {
        return {};
    }
}

export async function loadPolicy(key: PolicyKey) {
    const k = POLICY_META[key].copyKey;
    return parsePolicy(key, (await copyValues([k]))[k]);
}

export async function loadFaqs() {
    return parseFaqs((await copyValues([FAQ_COPY_KEY]))[FAQ_COPY_KEY]);
}

export async function loadSizeGuidePage() {
    return parseSizeGuidePage((await copyValues([SIZE_GUIDE_PAGE_KEY]))[SIZE_GUIDE_PAGE_KEY]);
}

/** What shop_info answers from: the same text the pages show. */
export async function loadShopContent(): Promise<ShopContent> {
    const v = await copyValues([FAQ_COPY_KEY, SIZE_GUIDE_PAGE_KEY, POLICY_META.refund.copyKey, POLICY_META.shipping.copyKey]);
    return {
        faqs: parseFaqs(v[FAQ_COPY_KEY]),
        size: parseSizeGuidePage(v[SIZE_GUIDE_PAGE_KEY]),
        refund: parsePolicy("refund", v[POLICY_META.refund.copyKey]),
        shipping: parsePolicy("shipping", v[POLICY_META.shipping.copyKey]),
    };
}

// One cached read per page path (a minute at most, and expired on save), so
// a page rendered per request, like /shop, doesn't query on every visit.
const seoRow = unstable_cache(
    async (path: string) => {
        const { data, error } = await supabaseAdmin.from("site_metadata")
            .select("title, description, keywords, og_image_url").eq("page_path", path).maybeSingle();
        if (error) throw error;
        return data as { title: string | null; description: string | null; keywords: string | null; og_image_url: string | null } | null;
    },
    ["page-seo"],
    { revalidate: 60, tags: [PAGE_SEO_TAG] },
);

/**
 * A page's search-engine title and description: the row saved in
 * Content › Pages › Search engines for this path, else the page's own.
 */
export async function pageSeo(path: string, fallback: Metadata): Promise<Metadata> {
    try {
        return withSeoRow(await seoRow(path), fallback);
    } catch {
        return fallback;
    }
}

const imageRows = unstable_cache(
    async () => {
        const { data, error } = await supabaseAdmin.from("site_assets").select("section_key, image_url, alt_text, link_url, is_active");
        if (error) throw error;
        return (data ?? []) as SiteImageRow[];
    },
    ["site-images"],
    { revalidate: 60, tags: [SITE_IMAGES_TAG] },
);

/** The site images a page shows, by slot. A slot with nothing to show (or a
 *  failed read) is null, and the page keeps the look it had before. */
export async function loadSiteImages<K extends string>(keys: readonly K[]): Promise<Record<K, ShownImage | null>> {
    let rows: SiteImageRow[] = [];
    try { rows = await imageRows(); } catch { /* the page's own look */ }
    return Object.fromEntries(keys.map(k => [k, shownImage(rows.find(r => r.section_key === k))])) as Record<K, ShownImage | null>;
}
