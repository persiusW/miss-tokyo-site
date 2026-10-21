"use server";

// Every write the Content area makes. Server actions are public endpoints and
// run on the service role, so each one re-checks that the caller is an owner
// or admin first (the old CMS tabs wrote straight from the browser). Each
// refreshes the shop pages it changes.
import { revalidatePath, updateTag } from "next/cache";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireStaff } from "@/lib/ai/requireStaff";
import { logCause } from "@/lib/errors/apiError";
import { errorBody, type ErrorCode } from "@/lib/errors/catalogue";
import { HOME_LAYOUT_KEY, OWN_SWITCH, cleanLayout, parseLayout, type HomeSectionId, type HomeLayout } from "@/lib/content/homeLayout";
import { FAQ_COPY_KEY, POLICY_META, SIZE_GUIDE_PAGE_KEY, SIZE_MODAL_KEY, cleanFaqs, cleanPolicy, cleanSizeGuidePage, type PolicyKey } from "@/lib/content/pageDocs";
import { SITE_ASSETS, isConfigCopyKey } from "@/lib/content/wording";
import { REVIEWS_SOURCE_KEY, type ReviewsSource } from "@/lib/content/homeSections";
import { NAV_TAG } from "@/lib/content/shopNav";
import { PAGE_SEO_TAG } from "@/lib/content/load";
import {
    NAV_KEYS, PDP_KEYS, cleanAbout, cleanCarouselTabs, cleanFeatured, cleanGiftCards, cleanImage, cleanLink, cleanModalRows,
    cleanReview, cleanSeo, cleanSlide, cleanTrustItems, isUuid, type NavKey, type PdpKey, type SeoIn,
} from "@/lib/content/adminInput";
import { SEO_PATHS } from "./pagesList";

export type Done<T = undefined> = { ok: true; data?: T } | { ok: false; code: ErrorCode; error: string };

const OK = <T,>(data?: T): Done<T> => ({ ok: true, data });
function fail(code: ErrorCode, cause?: unknown, context?: Record<string, unknown>): Done<never> {
    if (cause !== undefined) logCause(code, cause, { area: "content", ...context });
    return { ok: false, ...errorBody(code, "staff") };
}
/** A calm sentence for something the person can fix. */
const nope = (error: string): Done<never> => ({ ok: false, code: "GEN-00", error });

async function gate(): Promise<Done<never> | null> {
    const who = await requireStaff(["admin", "owner"]);
    if ("status" in who) return who.status === 401 ? fail("AUTH-01") : nope("Only owners and admins can change the shop's content.");
    return null;
}

const SINGLETON = "singleton";
const now = () => new Date().toISOString();

async function updateSiteSettings(patch: Record<string, unknown>) {
    return supabaseAdmin.from("site_settings").update(patch).eq("id", SINGLETON);
}

/** Upsert one site_copy row. label and page_group are NOT NULL, so new rows get both. */
async function putCopy(copy_key: string, value: string, label: string, page_group: string) {
    const { data: existing } = await supabaseAdmin.from("site_copy").select("copy_key").eq("copy_key", copy_key).maybeSingle();
    if (existing) return supabaseAdmin.from("site_copy").update({ value, updated_at: now() }).eq("copy_key", copy_key);
    return supabaseAdmin.from("site_copy").insert({ copy_key, value, label, page_group, updated_at: now() });
}

async function putSeo(path: string, seoIn: unknown) {
    if (!SEO_PATHS.includes(path)) return { error: "path" };
    const seo: SeoIn = cleanSeo(seoIn);
    const { data: existing } = await supabaseAdmin.from("site_metadata").select("page_path").eq("page_path", path).maybeSingle();
    const row = { title: seo.title, description: seo.description || null, keywords: seo.keywords || null, og_image_url: seo.og_image_url || null, updated_at: now() };
    if (existing) return supabaseAdmin.from("site_metadata").update(row).eq("page_path", path);
    if (!seo.title && !seo.description && !seo.keywords && !seo.og_image_url) return { error: null };
    return supabaseAdmin.from("site_metadata").insert({ page_path: path, ...row });
}

const refreshHome = () => revalidatePath("/");

// ── Home page sections ───────────────────────────────────────────────────────

async function readLayout(): Promise<HomeLayout> {
    const { data } = await supabaseAdmin.from("site_copy").select("value").eq("copy_key", HOME_LAYOUT_KEY).maybeSingle();
    return parseLayout(data?.value);
}

async function writeLayout(layout: HomeLayout) {
    return putCopy(HOME_LAYOUT_KEY, JSON.stringify(cleanLayout(layout)), "Home page sections", "homepage");
}

export async function setHomeSectionShown(id: HomeSectionId, on: boolean): Promise<Done> {
    const denied = await gate(); if (denied) return denied;
    const own = OWN_SWITCH[id];
    if (own) {
        const { error } = await updateSiteSettings({ [own]: !!on });
        if (error) return fail("GEN-00", error, { id });
    } else {
        const layout = await readLayout();
        if (!layout.order.includes(id)) return nope("That section isn't on the home page.");
        const hidden = new Set(layout.hidden);
        if (on) hidden.delete(id); else hidden.add(id);
        const { error } = await writeLayout({ ...layout, hidden: [...hidden] });
        if (error) return fail("GEN-00", error, { id });
    }
    refreshHome();
    return OK();
}

export async function saveHomeOrder(order: HomeSectionId[]): Promise<Done> {
    const denied = await gate(); if (denied) return denied;
    const layout = await readLayout();
    const { error } = await writeLayout({ order, hidden: layout.hidden });
    if (error) return fail("GEN-00", error);
    refreshHome();
    return OK();
}

// ── Hero slides ──────────────────────────────────────────────────────────────

export async function saveSlide(input: unknown): Promise<Done<{ id: string }>> {
    const denied = await gate(); if (denied) return denied;
    const slide = cleanSlide(input);
    if (!slide) return nope("Add a heading first.");
    if (slide.id) {
        const { id, ...patch } = slide;
        const { error } = await supabaseAdmin.from("hero_slides").update({ ...patch, updated_at: now() }).eq("id", id);
        if (error) return fail("GEN-00", error);
        refreshHome();
        return OK({ id });
    }
    const { data: last } = await supabaseAdmin.from("hero_slides").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
    const { data, error } = await supabaseAdmin.from("hero_slides").insert({ ...slide, position: (last?.position ?? 0) + 1 }).select("id").single();
    if (error || !data) return fail("GEN-00", error);
    refreshHome();
    return OK({ id: data.id as string });
}

export async function setSlideShown(id: string, on: boolean): Promise<Done> {
    const denied = await gate(); if (denied) return denied;
    if (!isUuid(id)) return nope("That slide wasn't found.");
    const { error } = await supabaseAdmin.from("hero_slides").update({ enabled: !!on, updated_at: now() }).eq("id", id);
    if (error) return fail("GEN-00", error);
    refreshHome();
    return OK();
}

export async function deleteSlide(id: string): Promise<Done> {
    const denied = await gate(); if (denied) return denied;
    if (!isUuid(id)) return nope("That slide wasn't found.");
    const { error } = await supabaseAdmin.from("hero_slides").delete().eq("id", id);
    if (error) return fail("GEN-00", error);
    refreshHome();
    return OK();
}

/** Positions follow the order given: 1, 2, 3… */
async function reorder(table: "hero_slides" | "homepage_reviews", ids: string[]): Promise<Done> {
    const denied = await gate(); if (denied) return denied;
    if (!Array.isArray(ids) || ids.length > 100 || !ids.every(isUuid)) return nope("That order couldn't be saved.");
    const results = await Promise.all(ids.map((id, i) => supabaseAdmin.from(table).update({ position: i + 1 }).eq("id", id)));
    const bad = results.find(r => r.error);
    if (bad) return fail("GEN-00", bad.error, { table });
    refreshHome();
    return OK();
}

export async function reorderSlides(ids: string[]): Promise<Done> { return reorder("hero_slides", ids); }

// ── Promise strip, featured categories, new arrivals, newsletter ─────────────

export async function saveTrustItems(items: unknown): Promise<Done> {
    const denied = await gate(); if (denied) return denied;
    const { error } = await updateSiteSettings({ trust_bar_items: cleanTrustItems(items) });
    if (error) return fail("GEN-00", error);
    refreshHome();
    return OK();
}

export async function saveFeaturedCategories(slots: unknown): Promise<Done> {
    const denied = await gate(); if (denied) return denied;
    const rows = cleanFeatured(slots).map(r => ({ ...r, id: r.id ?? crypto.randomUUID(), updated_at: now() }));
    const { error } = await supabaseAdmin.from("featured_categories").upsert(rows, { onConflict: "id" });
    if (error) return fail("GEN-00", error);
    refreshHome();
    return OK();
}

export async function saveNewArrivals(input: { title: unknown; categoryId: unknown; limit: unknown; tabs: unknown }): Promise<Done> {
    const denied = await gate(); if (denied) return denied;
    const limit = Math.round(Number(input?.limit));
    if (!Number.isFinite(limit) || limit < 4 || limit > 16) return nope("Show between 4 and 16 products.");
    const { error } = await updateSiteSettings({
        homepage_new_arrivals_title: typeof input.title === "string" ? input.title.trim().slice(0, 120) || "New Arrivals" : "New Arrivals",
        homepage_new_arrivals_category_id: isUuid(input.categoryId) ? input.categoryId : null,
        homepage_new_arrivals_limit: limit,
    });
    if (error) return fail("GEN-00", error);
    const tabs = cleanCarouselTabs(input.tabs);
    if (tabs.length) {
        const { error: e2 } = await putCopy("carousel_config", JSON.stringify({ tabs }), "Homepage carousel tabs", "homepage");
        if (e2) return fail("GEN-00", e2);
    }
    refreshHome();
    return OK();
}

export async function saveNewsletter(input: { title: unknown; subtitle: unknown; couponEnabled: unknown; couponCode: unknown; couponPct: unknown }): Promise<Done> {
    const denied = await gate(); if (denied) return denied;
    const pct = Math.round(Number(input?.couponPct));
    if (!Number.isFinite(pct) || pct < 1 || pct > 100) return nope("The discount has to be between 1 and 100%.");
    const code = typeof input.couponCode === "string" ? input.couponCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 40) : "";
    const { error } = await updateSiteSettings({
        optin_title: typeof input.title === "string" ? input.title.trim().slice(0, 160) : "",
        optin_subtitle: typeof input.subtitle === "string" ? input.subtitle.trim().slice(0, 600) : "",
        welcome_coupon_enabled: input.couponEnabled === true,
        welcome_coupon_code: code,
        welcome_coupon_percentage: pct,
    });
    if (error) return fail("GEN-00", error);
    refreshHome();
    return OK();
}

export type Subscriber = { id: string; email: string; subscribed_at: string; coupon_code: string | null; source: string | null };

export async function listSubscribers(page: number): Promise<Done<{ rows: Subscriber[]; total: number }>> {
    const denied = await gate(); if (denied) return denied;
    const size = 20;
    const from = Math.max(0, Math.floor(Number(page) || 0)) * size;
    const { data, count, error } = await supabaseAdmin.from("newsletter_subscribers")
        .select("id, email, subscribed_at, coupon_code, source", { count: "exact" })
        .order("subscribed_at", { ascending: false }).range(from, from + size - 1);
    if (error) return fail("GEN-00", error);
    return OK({ rows: (data ?? []) as Subscriber[], total: count ?? 0 });
}

/** Every subscriber, read 1,000 at a time (PostgREST stops at 1,000 per select). */
export async function exportSubscribers(): Promise<Done<{ csv: string; count: number }>> {
    const denied = await gate(); if (denied) return denied;
    const all: Omit<Subscriber, "id">[] = [];
    for (let from = 0; from < 100_000; from += 1000) {
        const { data, error } = await supabaseAdmin.from("newsletter_subscribers")
            .select("email, subscribed_at, coupon_code, source").order("subscribed_at", { ascending: false }).range(from, from + 999);
        if (error) return fail("GEN-00", error);
        all.push(...((data ?? []) as Omit<Subscriber, "id">[]));
        if (!data || data.length < 1000) break;
    }
    const q = (v: string | null) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = ["Email,Subscribed At,Coupon Code,Source",
        ...all.map(r => [q(r.email), q(new Date(r.subscribed_at).toLocaleDateString("en-GB")), q(r.coupon_code), q(r.source)].join(","))].join("\n");
    return OK({ csv, count: all.length });
}

// ── Menu and product page switches ───────────────────────────────────────────

export async function setNavShown(key: NavKey, on: boolean): Promise<Done> {
    const denied = await gate(); if (denied) return denied;
    if (!(NAV_KEYS as readonly string[]).includes(key)) return nope("That menu link wasn't found.");
    const { error } = await updateSiteSettings({ [key]: !!on });
    if (error) return fail("GEN-00", error, { key });
    // The menu is on every shop page, read through one cached value.
    updateTag(NAV_TAG);
    return OK();
}

export async function setProductPagePart(key: PdpKey, on: boolean): Promise<Done> {
    const denied = await gate(); if (denied) return denied;
    if (!(PDP_KEYS as readonly string[]).includes(key)) return nope("That setting wasn't found.");
    const { error } = await updateSiteSettings({ [key]: !!on });
    if (error) return fail("GEN-00", error, { key });
    revalidatePath("/products/[slug]", "page");
    return OK();
}

// ── Reviews ──────────────────────────────────────────────────────────────────

export async function saveReview(input: unknown): Promise<Done<{ id: string }>> {
    const denied = await gate(); if (denied) return denied;
    const review = cleanReview(input);
    if (!review) return nope("Add the name to show first.");
    if (review.id) {
        const { id, ...patch } = review;
        const { error } = await supabaseAdmin.from("homepage_reviews").update({ ...patch, updated_at: now() }).eq("id", id);
        if (error) return fail("GEN-00", error);
        refreshHome();
        return OK({ id });
    }
    const { data: last } = await supabaseAdmin.from("homepage_reviews").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
    const { data, error } = await supabaseAdmin.from("homepage_reviews").insert({ ...review, position: (last?.position ?? 0) + 1 }).select("id").single();
    if (error || !data) return fail("GEN-00", error);
    refreshHome();
    return OK({ id: data.id as string });
}

export async function setReviewShown(id: string, on: boolean): Promise<Done> {
    const denied = await gate(); if (denied) return denied;
    if (!isUuid(id)) return nope("That review wasn't found.");
    const { error } = await supabaseAdmin.from("homepage_reviews").update({ enabled: !!on, updated_at: now() }).eq("id", id);
    if (error) return fail("GEN-00", error);
    refreshHome();
    return OK();
}

export async function deleteReview(id: string): Promise<Done> {
    const denied = await gate(); if (denied) return denied;
    if (!isUuid(id)) return nope("That review wasn't found.");
    const { error } = await supabaseAdmin.from("homepage_reviews").delete().eq("id", id);
    if (error) return fail("GEN-00", error);
    refreshHome();
    return OK();
}

export async function reorderReviews(ids: string[]): Promise<Done> { return reorder("homepage_reviews", ids); }

/** Which reviews the home page shows: the Transparent Turtle widget or the team's own. */
export async function setReviewsSource(source: ReviewsSource): Promise<Done> {
    const denied = await gate(); if (denied) return denied;
    if (source !== "widget" && source !== "own") return nope("Choose which reviews to show.");
    const { error } = await putCopy(REVIEWS_SOURCE_KEY, source, "Home page reviews", "homepage");
    if (error) return fail("GEN-00", error);
    refreshHome();
    return OK();
}

// ── Pages ────────────────────────────────────────────────────────────────────

async function finishPage(path: string, seo: unknown): Promise<Done> {
    const r = await putSeo(path, seo);
    if (r.error) return fail("GEN-00", r.error, { path });
    updateTag(PAGE_SEO_TAG);
    revalidatePath(path);
    return OK();
}

/** The shop page has no text to edit here, only its search-engine text. */
export async function publishShopPage(seo: unknown): Promise<Done> {
    const denied = await gate(); if (denied) return denied;
    return finishPage("/shop", seo);
}

export async function publishAbout(input: unknown, seo: unknown): Promise<Done> {
    const denied = await gate(); if (denied) return denied;
    const { error } = await updateSiteSettings(cleanAbout(input));
    if (error) return fail("GEN-00", error);
    return finishPage("/about", seo);
}

export async function publishPolicy(key: PolicyKey, doc: unknown, seo: unknown): Promise<Done> {
    const denied = await gate(); if (denied) return denied;
    const meta = POLICY_META[key];
    if (!meta) return nope("That page wasn't found.");
    const clean = cleanPolicy(doc);
    if (!clean) return nope("Add some text before publishing. An empty page would show the original wording.");
    const { error } = await putCopy(meta.copyKey, JSON.stringify(clean), meta.name, "pages");
    if (error) return fail("GEN-00", error, { key });
    return finishPage(meta.path, seo);
}

export async function publishFaq(items: unknown, seo: unknown): Promise<Done> {
    const denied = await gate(); if (denied) return denied;
    const faqs = cleanFaqs(items);
    if (!faqs) return nope("Add at least one question with an answer.");
    const { error } = await putCopy(FAQ_COPY_KEY, JSON.stringify(faqs), "FAQ", "pages");
    if (error) return fail("GEN-00", error);
    return finishPage("/faq", seo);
}

export async function publishSizeGuide(input: { page: unknown; modalRows: unknown }, seo: unknown): Promise<Done> {
    const denied = await gate(); if (denied) return denied;
    const page = cleanSizeGuidePage(input?.page);
    if (!page) return nope("The size guide page needs at least one size.");
    const modal = cleanModalRows(input?.modalRows);
    if (!modal.length) return nope("The product page size table needs at least one size.");
    const a = await putCopy(SIZE_GUIDE_PAGE_KEY, JSON.stringify(page), "Size guide page", "pages");
    if (a.error) return fail("GEN-00", a.error);
    const b = await putCopy(SIZE_MODAL_KEY, JSON.stringify(modal), "Size Guide Table", "size_guide");
    if (b.error) return fail("GEN-00", b.error);
    revalidatePath("/products/[slug]", "page");
    return finishPage("/size-guide", seo);
}

export async function publishGiftCardsPage(input: unknown, seo: unknown): Promise<Done> {
    const denied = await gate(); if (denied) return denied;
    const gc = cleanGiftCards(input);
    if (!gc) return nope("The smallest amount can't be more than the largest.");
    const { error } = await updateSiteSettings(gc);
    if (error) return fail("GEN-00", error);
    return finishPage("/gift-cards", seo);
}

// ── Shop wording and images ──────────────────────────────────────────────────

export async function saveWording(key: string, value: string, meta: { label: string; group: string }): Promise<Done> {
    const denied = await gate(); if (denied) return denied;
    if (typeof key !== "string" || !/^[a-z0-9_]{1,80}$/.test(key) || isConfigCopyKey(key)) return nope("That wording can't be changed here.");
    const text = typeof value === "string" ? value.slice(0, 5000) : "";
    const { error } = await putCopy(key, text, String(meta?.label ?? key).slice(0, 120), String(meta?.group ?? "general").slice(0, 40));
    if (error) return fail("GEN-00", error, { key });
    revalidatePath("/craft");
    revalidatePath("/");
    return OK();
}

export async function saveSiteImage(key: string, input: { image_url: unknown; alt_text: unknown; link_url: unknown }): Promise<Done> {
    const denied = await gate(); if (denied) return denied;
    const def = SITE_ASSETS.find(a => a.key === key);
    if (!def) return nope("That image slot wasn't found.");
    const row = {
        image_url: cleanImage(input?.image_url) || null,
        alt_text: typeof input?.alt_text === "string" ? input.alt_text.trim().slice(0, 300) || null : null,
        link_url: cleanLink(input?.link_url) || null,
        updated_at: now(),
    };
    const { data: existing } = await supabaseAdmin.from("site_assets").select("section_key").eq("section_key", key).maybeSingle();
    const { error } = existing
        ? await supabaseAdmin.from("site_assets").update(row).eq("section_key", key)
        : await supabaseAdmin.from("site_assets").insert({ section_key: key, label: def.label, is_active: true, ...row });
    if (error) return fail("GEN-00", error, { key });
    revalidatePath("/craft");
    return OK();
}
