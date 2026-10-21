"use client";

// Pieces every Content tab uses: the header and route tabs, the save helpers
// (panels save from their footer; list switches save at once with Undo), the
// move buttons and the "Search engines" card.
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { BtnLink, Card, ErrorState, Field, Icon, IconBtn, PageHeader, Tabs, toast } from "@/components/admin/ui";
import { ImageUploader } from "@/components/ui/miss-tokyo/ImageUploader";
import type { SeoIn } from "@/lib/content/adminInput";
import type { Done } from "./actions";
import "./content.css";

export type ContentTab = "home" | "pages" | "menu" | "reviews" | "text";

const TABS: { v: ContentTab; l: string; href: string }[] = [
    { v: "home", l: "Home page", href: "/content" },
    { v: "pages", l: "Pages", href: "/content/pages" },
    { v: "menu", l: "Menu", href: "/content/menu" },
    { v: "reviews", l: "Reviews", href: "/content/reviews" },
    { v: "text", l: "Shop wording", href: "/content/text" },
];

export function ContentFrame({ tab, children }: { tab: ContentTab; children: ReactNode }) {
    return (
        <div className="ct">
            <PageHeader title="Content" sub="What customers read and see on the shop: the home page, pages, menu and reviews."
                actions={<BtnLink kind="ghost" icon="globe" href="/" external>View shop</BtnLink>} />
            <Tabs label="Content sections" tabs={TABS} value={tab} />
            <div className="stack-lg ct-body">{children}</div>
        </div>
    );
}

/** A failed first load: a calm card with Try again. */
export function LoadFailed({ what }: { what: string }) {
    const router = useRouter();
    return <Card><ErrorState what={what} body="Nothing was changed. Try again in a moment." onRetry={() => router.refresh()} /></Card>;
}

/** Runs a save and shows the calm error toast if it fails. */
export async function run<T>(p: Promise<Done<T>>): Promise<Done<T> | null> {
    try {
        const r = await p;
        if (!r.ok) toast.fromResponse(r, { audience: "staff" });
        return r;
    } catch (e) {
        console.error("[content] save failed", e);
        toast.code("NET-01", { audience: "staff" });
        return null;
    }
}

/**
 * A list switch: shows the change at once, saves it, and offers Undo.
 * If the save fails the switch goes back.
 */
export async function quickSwitch(opts: { value: boolean; apply: (v: boolean) => void; save: (v: boolean) => Promise<Done>; onMsg: string; offMsg: string; after?: () => void }) {
    const { value, apply, save, onMsg, offMsg, after } = opts;
    apply(value);
    const r = await run(save(value));
    if (!r?.ok) { apply(!value); return; }
    after?.();
    toast.success(value ? onMsg : offMsg, {
        action: {
            label: "Undo",
            onClick: async () => {
                apply(!value);
                const u = await run(save(!value));
                if (!u?.ok) apply(value); else after?.();
            },
        },
    });
}

/** Move-up / move-down pair. 44 px targets, each labelled. */
export function MoveButtons({ name, first, last, onMove, disabled }: { name: string; first: boolean; last: boolean; onMove: (d: -1 | 1) => void; disabled?: boolean }) {
    return (
        <div className="ct-move">
            <IconBtn icon="chevd" label={`Move ${name} up`} className="icon-btn ct-up" disabled={first || disabled} onClick={() => onMove(-1)} />
            <IconBtn icon="chevd" label={`Move ${name} down`} disabled={last || disabled} onClick={() => onMove(1)} />
        </div>
    );
}

export function swap<T>(list: T[], i: number, d: -1 | 1): T[] {
    const j = i + d;
    if (j < 0 || j >= list.length) return list;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
}

/** "Search engines": the title and description Google shows for this page. */
export function SeoCard({ path, value, onChange, fallbackTitle }: { path: string; value: SeoIn; onChange: (v: SeoIn) => void; fallbackTitle: string }) {
    const id = path.replace(/\W+/g, "-");
    const set = (k: keyof SeoIn) => (v: string) => onChange({ ...value, [k]: v });
    return (
        <Card inset title="Search engines">
            <div className="card-body stack">
                <Field label="Title in search results" htmlFor={`seo-t${id}`} help={`Up to 60 characters · ${value.title.length} now. Leave empty to use “${fallbackTitle}”.`}>
                    <input id={`seo-t${id}`} className="input" value={value.title} maxLength={120} onChange={e => set("title")(e.target.value)} placeholder={fallbackTitle} />
                </Field>
                <Field label="Description in search results" htmlFor={`seo-d${id}`} help={`Up to 160 characters · ${value.description.length} now.`}>
                    <textarea id={`seo-d${id}`} className="textarea" style={{ minHeight: 72 }} maxLength={320} value={value.description} onChange={e => set("description")(e.target.value)} />
                </Field>
                <Field label="Keywords" htmlFor={`seo-k${id}`} help="Separate with commas. Most search engines ignore these; they're kept for completeness.">
                    <input id={`seo-k${id}`} className="input" value={value.keywords} onChange={e => set("keywords")(e.target.value)} />
                </Field>
                <div className="field">
                    <ImageUploader bucket="site-assets" folder="og-images" currentUrl={value.og_image_url || null}
                        onUpload={url => set("og_image_url")(url)} onRemove={() => set("og_image_url")("")} aspectRatio="og" label="Image when the link is shared" />
                </div>
                <div className="ct-serp" aria-label="How it may look in search results">
                    <div className="xs muted">misstokyo.shop{path}</div>
                    <div className="ct-serp-t">{value.title || fallbackTitle}</div>
                    {value.description && <div className="sm ink2">{value.description}</div>}
                </div>
            </div>
        </Card>
    );
}

/** Small "+ Add …" button used under editable lists. */
export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClick}>
            <Icon n="plus" />{label}
        </button>
    );
}
