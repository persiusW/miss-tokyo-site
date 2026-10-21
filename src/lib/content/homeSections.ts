// What the home page's New Arrivals and Customer reviews sections show,
// worked out from what Content › Home page saved. Pure: the page loads the
// rows. With nothing saved, each gives what the shop showed before it read
// these settings (the 16 newest products, one list, the review widget).
import { cleanCarouselTabs, type CarouselTab } from "./adminInput";
import { wordingText } from "./wording";

export const CAROUSEL_KEY = "carousel_config";
export const REVIEWS_SOURCE_KEY = "homepage_reviews_source";
export const NEW_ARRIVALS_WORDING = ["home_new_arrivals_eyebrow", "home_new_arrivals_link"] as const;

export const NEW_ARRIVALS_DEFAULT_LIMIT = 16;
export const NEW_ARRIVALS_DEFAULT_TITLE = "New Arrivals";
export const DEFAULT_CAROUSEL_TABS: CarouselTab[] = [{ label: "New In", mode: "newest", category_name: "" }];

/** carousel_config's tabs; a missing or broken value is the one list. */
export function parseCarouselTabs(raw: string | null | undefined): CarouselTab[] {
    if (!raw) return DEFAULT_CAROUSEL_TABS;
    try {
        const tabs = cleanCarouselTabs((JSON.parse(raw) as { tabs?: unknown })?.tabs);
        return tabs.length ? tabs : DEFAULT_CAROUSEL_TABS;
    } catch {
        return DEFAULT_CAROUSEL_TABS;
    }
}

export type NewArrivalsConfig = {
    title: string; eyebrow: string; linkLabel: string;
    limit: number; categoryId: string | null; tabs: CarouselTab[];
};

type Settings = { homepage_new_arrivals_title?: string | null; homepage_new_arrivals_category_id?: string | null; homepage_new_arrivals_limit?: number | null } | null | undefined;

export function newArrivalsConfig(s: Settings, copy: Record<string, string | null | undefined>): NewArrivalsConfig {
    const n = Math.round(Number(s?.homepage_new_arrivals_limit));
    return {
        title: s?.homepage_new_arrivals_title?.trim() || NEW_ARRIVALS_DEFAULT_TITLE,
        eyebrow: wordingText(copy, "home_new_arrivals_eyebrow"),
        linkLabel: wordingText(copy, "home_new_arrivals_link"),
        limit: Number.isFinite(n) && n >= 1 ? Math.min(n, 24) : NEW_ARRIVALS_DEFAULT_LIMIT,
        categoryId: s?.homepage_new_arrivals_category_id || null,
        tabs: parseCarouselTabs(copy[CAROUSEL_KEY]),
    };
}

/** "New Arrivals" → ["New", "Arrivals"]: the shop sets the last word in italics. */
export function splitLastWord(text: string): [string, string] {
    const t = text.trim();
    const i = t.lastIndexOf(" ");
    return i < 0 ? ["", t] : [t.slice(0, i), t.slice(i + 1)];
}

export type ReviewsSource = "widget" | "own";
export const parseReviewsSource = (raw: string | null | undefined): ReviewsSource => (raw?.trim() === "own" ? "own" : "widget");

/** The average shown beside the team's own reviews, from the reviews shown. */
export function reviewSummary(ratings: number[]): { average: string; count: number } | null {
    const ok = ratings.map(Number).filter(r => Number.isFinite(r) && r >= 1 && r <= 5);
    if (!ok.length) return null;
    return { average: (ok.reduce((a, b) => a + b, 0) / ok.length).toFixed(1), count: ok.length };
}
