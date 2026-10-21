// Server-side reads of the editable shop pages, for the storefront and for
// Ask Miss Tokyo. A failed read shows the original text, never an empty page.
import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { FAQ_COPY_KEY, POLICY_META, SIZE_GUIDE_PAGE_KEY, parseFaqs, parsePolicy, parseSizeGuidePage, type PolicyKey } from "./pageDocs";
import type { ShopContent } from "./shopInfoText";

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

/**
 * A page's search-engine title and description: the row saved in
 * Content › Pages › Search engines for this path, else the page's own.
 */
export async function pageSeo(path: string, fallback: Metadata): Promise<Metadata> {
    try {
        const { data } = await supabaseAdmin.from("site_metadata")
            .select("title, description, keywords, og_image_url").eq("page_path", path).maybeSingle();
        if (!data) return fallback;
        return {
            ...fallback,
            title: data.title?.trim() || fallback.title,
            description: data.description?.trim() || fallback.description,
            ...(data.keywords?.trim() ? { keywords: data.keywords } : {}),
            ...(data.og_image_url ? { openGraph: { ...(fallback.openGraph ?? {}), images: [data.og_image_url] } } : {}),
        };
    } catch {
        return fallback;
    }
}
