// The shop's info pages (policies, FAQ, size guide) as editable documents.
//
// The text in src/content/shopInfo.ts (and the policy pages' own wording) is
// the original. The owner can replace it from Content › Pages; the replacement
// is kept in site_copy under the keys below, and every page, plus Ask Miss
// Tokyo's shop_info tool, reads the saved version with the original as the
// fallback. So the chat still never says something the pages don't.
//
// Pure and client-safe: the admin editor and the storefront both import it.
import { FAQS, FIT_NOTE, HOW_TO_MEASURE, REFUND_POLICY, SHIPPING_POLICY, SIZE_CHART, type Faq } from "@/content/shopInfo";

/** One heading and its text. In `body`, a line starting with "- " is a list
 *  item; any other line is a paragraph. `[label](/path)` makes a link and an
 *  email address becomes a mail link. */
export type DocSection = { heading: string; body: string };
export type PolicyDoc = { intro: string; sections: DocSection[] };

export type SizeRowIn = { label: string; bust: string; waist: string; hip: string };
export type MeasureTip = { label: string; desc: string };
export type SizeGuidePage = { note: string; rows: SizeRowIn[]; measure: MeasureTip[]; fitNote: string };

export type PolicyKey = "shipping" | "refund" | "privacy" | "terms";

export const POLICY_KEYS: readonly PolicyKey[] = ["shipping", "refund", "privacy", "terms"];

export const POLICY_META: Record<PolicyKey, { name: string; path: string; copyKey: string; title: string }> = {
    shipping: { name: "Shipping policy", path: "/policies/shipping-policy", copyKey: "page_policy_shipping", title: "Shipping Policy" },
    refund: { name: "Refund policy", path: "/policies/refund-policy", copyKey: "page_policy_refund", title: "Refund Policy" },
    privacy: { name: "Privacy policy", path: "/policies/privacy-policy", copyKey: "page_policy_privacy", title: "Privacy Policy" },
    terms: { name: "Terms and conditions", path: "/policies/terms-and-conditions", copyKey: "page_policy_terms", title: "Terms & Conditions" },
};

export const FAQ_COPY_KEY = "page_faq";
export const SIZE_GUIDE_PAGE_KEY = "page_size_guide";
/** The cm table in the product page's "Size Guide" pop-up (SizeGuideModal). */
export const SIZE_MODAL_KEY = "size_guide_rows";

const list = (items: readonly string[]) => items.map(t => `- ${t}`).join("\n");

export const DEFAULT_POLICIES: Record<PolicyKey, PolicyDoc> = {
    shipping: {
        intro: SHIPPING_POLICY.intro,
        sections: [
            { heading: "Processing & Delivery", body: list(SHIPPING_POLICY.processing) },
            { heading: "Questions", body: `For shipping enquiries, contact us at ${SHIPPING_POLICY.contactEmail}.` },
        ],
    },
    refund: {
        intro: REFUND_POLICY.intro,
        sections: [
            { heading: "Eligibility", body: list(REFUND_POLICY.eligibility) },
            { heading: "Once Your Return Is Approved", body: list(REFUND_POLICY.approved) },
            { heading: "Please Note", body: REFUND_POLICY.note },
            { heading: "Contact", body: `To initiate a return, contact us at ${REFUND_POLICY.contactEmail} within 72 hours of delivery.` },
        ],
    },
    privacy: {
        intro: "Miss Tokyo respects your privacy and is committed to protecting your personal information.",
        sections: [
            { heading: "Information We Collect", body: list(["Name, phone number, and email address", "Delivery address", "Payment and order information", "Website usage data for improving customer experience"]) },
            { heading: "How We Use Your Information", body: list(["Process and deliver orders", "Communicate order updates and customer support", "Improve our services and website experience"]) },
            { heading: "Data Sharing", body: "We do not sell or share your personal data with third parties except when required for payment processing, delivery services, or legal obligations." },
            { heading: "Contact", body: "For any privacy concerns, contact us at orders@misstokyo.shop." },
        ],
    },
    terms: {
        intro: "By using the Miss Tokyo website or purchasing from us, you agree to the following terms.",
        sections: [
            { heading: "Orders & Payments", body: list(["All orders must be fully paid before processing and delivery.", "Prices and product availability may change without prior notice."]) },
            { heading: "Products", body: "We aim to display products accurately, but slight colour or design differences may occur due to lighting or screen settings." },
            { heading: "Returns & Exchanges", body: "Returns are only accepted within 72 hours after delivery and must meet our return conditions. See our [Refund Policy](/policies/refund-policy) for full details." },
            { heading: "Limitation of Liability", body: "Miss Tokyo is not responsible for delays caused by courier services or external factors, or for any issues arising from the improper use of purchased products." },
            { heading: "Updates to Policies", body: "We may update these policies at any time. Changes will be posted on this page." },
        ],
    },
};

export const DEFAULT_SIZE_GUIDE_PAGE: SizeGuidePage = {
    note: "All measurements are in inches. For the best fit, measure over your natural curves.",
    rows: SIZE_CHART.map(r => ({ ...r })),
    measure: HOW_TO_MEASURE.map(m => ({ ...m })),
    fitNote: FIT_NOTE,
};

export const DEFAULT_FAQS: Faq[] = FAQS.map(f => ({ ...f }));

// ── Parsing saved values ─────────────────────────────────────────────────────
// A saved value that doesn't parse, or that empties a page, falls back to the
// original, so a bad save can never blank a policy page.

const str = (v: unknown, max = 4000) => (typeof v === "string" ? v.slice(0, max) : "");

function json(raw: string | null | undefined): unknown {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
}

export function cleanPolicy(v: unknown): PolicyDoc | null {
    if (!v || typeof v !== "object") return null;
    const o = v as { intro?: unknown; sections?: unknown };
    const sections = (Array.isArray(o.sections) ? o.sections : [])
        .slice(0, 30)
        .map(s => ({ heading: str((s as DocSection)?.heading, 200).trim(), body: str((s as DocSection)?.body).trim() }))
        .filter(s => s.heading || s.body);
    const intro = str(o.intro).trim();
    if (!intro && sections.length === 0) return null;
    return { intro, sections };
}

export function parsePolicy(key: PolicyKey, raw: string | null | undefined): PolicyDoc {
    return cleanPolicy(json(raw)) ?? DEFAULT_POLICIES[key];
}

export function cleanFaqs(v: unknown): Faq[] | null {
    if (!Array.isArray(v)) return null;
    const out = v.slice(0, 100)
        .map(f => ({ section: str((f as Faq)?.section, 120).trim() || "General", question: str((f as Faq)?.question, 400).trim(), answer: str((f as Faq)?.answer).trim() }))
        .filter(f => f.question && f.answer);
    return out.length ? out : null;
}

export function parseFaqs(raw: string | null | undefined): Faq[] {
    return cleanFaqs(json(raw)) ?? DEFAULT_FAQS;
}

export function cleanSizeGuidePage(v: unknown): SizeGuidePage | null {
    if (!v || typeof v !== "object") return null;
    const o = v as Partial<Record<keyof SizeGuidePage, unknown>>;
    const rows = (Array.isArray(o.rows) ? o.rows : []).slice(0, 40)
        .map(r => ({ label: str((r as SizeRowIn)?.label, 60).trim(), bust: str((r as SizeRowIn)?.bust, 40).trim(), waist: str((r as SizeRowIn)?.waist, 40).trim(), hip: str((r as SizeRowIn)?.hip, 40).trim() }))
        .filter(r => r.label);
    if (rows.length === 0) return null;
    const measure = (Array.isArray(o.measure) ? o.measure : []).slice(0, 10)
        .map(m => ({ label: str((m as MeasureTip)?.label, 60).trim(), desc: str((m as MeasureTip)?.desc, 600).trim() }))
        .filter(m => m.label && m.desc);
    return { note: str(o.note, 600).trim(), rows, measure, fitNote: str(o.fitNote, 1000).trim() };
}

export function parseSizeGuidePage(raw: string | null | undefined): SizeGuidePage {
    return cleanSizeGuidePage(json(raw)) ?? DEFAULT_SIZE_GUIDE_PAGE;
}

// ── Rendering helpers ────────────────────────────────────────────────────────

export type Block = { kind: "p"; text: string } | { kind: "ul"; items: string[] };

/** A section body as paragraphs and lists, in order. */
export function bodyBlocks(body: string): Block[] {
    const out: Block[] = [];
    for (const raw of body.split("\n")) {
        const line = raw.trim();
        if (!line) continue;
        const item = /^[-•*]\s+(.*)$/.exec(line);
        if (item) {
            const last = out[out.length - 1];
            if (last?.kind === "ul") last.items.push(item[1]);
            else out.push({ kind: "ul", items: [item[1]] });
        } else out.push({ kind: "p", text: line });
    }
    return out;
}

export type Inline = { kind: "text"; text: string } | { kind: "link"; text: string; href: string };

/** Only links that stay on the shop, go to a secure site, or open mail. */
export function safeHref(href: string): string | null {
    const h = href.trim();
    if (/^\/(?!\/)/.test(h)) return h;
    if (/^https:\/\/[^\s]+$/i.test(h)) return h;
    if (/^mailto:[^\s@]+@[^\s@]+$/i.test(h)) return h;
    return null;
}

/** "[label](href)" links and bare email addresses, split out of a line. */
export function inlineParts(text: string): Inline[] {
    const out: Inline[] = [];
    const re = /\[([^\]]+)\]\(([^)\s]+)\)|([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
    let at = 0;
    for (let m = re.exec(text); m; m = re.exec(text)) {
        if (m.index > at) out.push({ kind: "text", text: text.slice(at, m.index) });
        if (m[1]) {
            const href = safeHref(m[2]);
            out.push(href ? { kind: "link", text: m[1], href } : { kind: "text", text: m[1] });
        } else {
            out.push({ kind: "link", text: m[3], href: `mailto:${m[3]}` });
        }
        at = m.index + m[0].length;
    }
    if (at < text.length) out.push({ kind: "text", text: text.slice(at) });
    return out;
}

/** Plain text for the shop assistant: links lose their markup. */
export function plainLine(text: string): string {
    return inlineParts(text).map(p => p.text).join("");
}

export function docToText(doc: PolicyDoc): string {
    const lines: string[] = [];
    if (doc.intro) lines.push(plainLine(doc.intro));
    for (const s of doc.sections) {
        const body = bodyBlocks(s.body).flatMap(b => (b.kind === "p" ? [b.text] : b.items)).map(plainLine);
        lines.push(s.heading ? `${s.heading}: ${body.join(" ")}` : body.join(" "));
    }
    return lines.join("\n");
}
