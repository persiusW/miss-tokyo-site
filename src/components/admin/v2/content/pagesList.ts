// The shop pages Content › Pages can edit, and the path each one's
// search-engine text is saved under (site_metadata.page_path).
import { POLICY_META, type PolicyKey } from "@/lib/content/pageDocs";

export type PageId = "shop" | "about" | "size-guide" | PolicyKey | "faq" | "gift-cards";

export const CONTENT_PAGES: { id: PageId; name: string; path: string; seoTitle: string }[] = [
    { id: "shop", name: "Shop page", path: "/shop", seoTitle: "Shop — Miss Tokyo" },
    { id: "about", name: "About", path: "/about", seoTitle: "About — Miss Tokyo" },
    { id: "size-guide", name: "Size guide", path: "/size-guide", seoTitle: "Size Guide — Miss Tokyo" },
    { id: "shipping", name: POLICY_META.shipping.name, path: POLICY_META.shipping.path, seoTitle: "Shipping Policy — Miss Tokyo" },
    { id: "refund", name: POLICY_META.refund.name, path: POLICY_META.refund.path, seoTitle: "Refund Policy — Miss Tokyo" },
    { id: "privacy", name: POLICY_META.privacy.name, path: POLICY_META.privacy.path, seoTitle: "Privacy Policy — Miss Tokyo" },
    { id: "terms", name: POLICY_META.terms.name, path: POLICY_META.terms.path, seoTitle: "Terms & Conditions — Miss Tokyo" },
    { id: "faq", name: "FAQ", path: "/faq", seoTitle: "FAQ — Miss Tokyo" },
    { id: "gift-cards", name: "Gift cards page", path: "/gift-cards", seoTitle: "Gift Cards — Miss Tokyo" },
];

export const SEO_PATHS = CONTENT_PAGES.map(p => p.path);
export const pageById = (id: string) => CONTENT_PAGES.find(p => p.id === id);
