"use client";

// Content › Home page: the sections in the order customers see them, the hero
// slides, and a panel per section for its settings.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Btn, Card, Empty, Icon, Switch, Thumb, plural, toast } from "@/components/admin/ui";
import { HOME_SECTIONS, OWN_SWITCH, type HomeSectionId } from "@/lib/content/homeLayout";
import type { HomeData, Slide } from "./data";
import { reorderSlides, saveHomeOrder, setHomeSectionShown } from "./actions";
import { MoveButtons, quickSwitch, run, swap } from "./shared";
import { SlidePanel } from "./home/SlidePanel";
import { TrustPanel } from "./home/TrustPanel";
import { FeaturedPanel } from "./home/FeaturedPanel";
import { NewArrivalsPanel } from "./home/NewArrivalsPanel";
import { NewsletterPanel } from "./home/NewsletterPanel";
import { ReviewsSourcePanel } from "./home/ReviewsSourcePanel";

type PanelKey = "trust" | "categories" | "new_arrivals" | "reviews" | "newsletter";
const EDITABLE: Partial<Record<HomeSectionId, PanelKey>> = { trust: "trust", categories: "categories", new_arrivals: "new_arrivals", reviews: "reviews", newsletter: "newsletter" };

export function HomeTab({ data }: { data: HomeData }) {
    const router = useRouter();
    const [order, setOrder] = useState(data.layout.order);
    const [hidden, setHidden] = useState(new Set(data.layout.hidden));
    const [trustOn, setTrustOn] = useState(data.trustEnabled);
    const [newsOn, setNewsOn] = useState(data.newsletter.enabled);
    const [slides, setSlides] = useState<Slide[]>(data.slides);
    const [slide, setSlide] = useState<Slide | "new" | null>(null);
    const [panel, setPanel] = useState<PanelKey | null>(null);
    const [busy, setBusy] = useState(false);

    // Keep local copies in step after router.refresh() brings new props.
    const [seen, setSeen] = useState(data);
    if (seen !== data) {
        setSeen(data);
        setOrder(data.layout.order);
        setHidden(new Set(data.layout.hidden));
        setTrustOn(data.trustEnabled);
        setNewsOn(data.newsletter.enabled);
        setSlides(data.slides);
    }

    const shown = (id: HomeSectionId) => (id === "trust" ? trustOn : id === "newsletter" ? newsOn : !hidden.has(id));
    const applyShown = (id: HomeSectionId, v: boolean) => {
        if (OWN_SWITCH[id]) (id === "trust" ? setTrustOn : setNewsOn)(v);
        else setHidden(h => { const n = new Set(h); if (v) n.delete(id); else n.add(id); return n; });
    };
    const nameOf = (id: HomeSectionId) => HOME_SECTIONS.find(s => s.id === id)?.name ?? id;

    const moveSection = async (i: number, d: -1 | 1) => {
        const before = order;
        const next = swap(order, i, d);
        setOrder(next);
        setBusy(true);
        const r = await run(saveHomeOrder(next));
        setBusy(false);
        if (!r?.ok) { setOrder(before); return; }
        toast.success("Section order saved", {
            action: { label: "Undo", onClick: async () => { setOrder(before); const u = await run(saveHomeOrder(before)); if (!u?.ok) setOrder(next); } },
        });
    };

    const moveSlide = async (i: number, d: -1 | 1) => {
        const before = slides;
        const next = swap(slides, i, d);
        setSlides(next);
        setBusy(true);
        const r = await run(reorderSlides(next.map(s => s.id)));
        setBusy(false);
        if (!r?.ok) { setSlides(before); return; }
        toast.success("Slide order saved", {
            action: { label: "Undo", onClick: async () => { setSlides(before); const u = await run(reorderSlides(before.map(s => s.id))); if (!u?.ok) setSlides(next); } },
        });
    };

    const desc = (id: HomeSectionId): string => {
        switch (id) {
            case "hero": {
                const on = slides.filter(s => s.enabled).length;
                return slides.length ? `${plural(slides.length, "slide")} · ${on} showing` : "No slides yet";
            }
            case "trust": {
                const items = data.trustItems.filter(t => t.enabled).map(t => t.text);
                return items.length ? items.join(" · ") : "No messages yet";
            }
            case "categories": {
                const names = data.featured.filter(f => f.enabled && f.category_id)
                    .map(f => f.custom_label || data.categories.find(c => c.id === f.category_id)?.name).filter(Boolean);
                return names.length ? names.join(", ") : "No categories picked";
            }
            case "new_arrivals": {
                const na = data.newArrivals;
                const cat = na.categoryId ? data.categories.find(c => c.id === na.categoryId)?.name ?? "one category" : null;
                const what = na.tabs.length > 1
                    ? `${na.tabs.length} tabs: ${na.tabs.map(t => t.label || "Untitled").join(", ")}`
                    : `The ${na.limit} ${na.tabs[0]?.mode === "sort_order" ? "first products in shop order" : "newest products"}`;
                return `“${na.title}” · ${what}${cat ? ` from ${cat}` : ""}`;
            }
            case "reviews":
                return data.reviews.source === "own"
                    ? `Your reviews · ${plural(data.reviews.shown, "review")} showing`
                    : "Review widget from Transparent Turtle";
            case "newsletter":
                return `${data.newsletter.title ? `“${data.newsletter.title}” · ` : ""}${plural(data.newsletter.subscribers, "subscriber")}`;
            case "instagram":
                return data.instagram ? `Latest posts from ${data.instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, "@").replace(/\/$/, "")}` : "Latest posts from Instagram";
        }
    };

    return (
        <>
            <p className="help">Sections show on the home page in this order. Switches and moves take effect straight away.</p>
            <div className="split">
                <Card title="Home page sections">
                    <div className="rows">
                        {order.map((id, i) => {
                            const edit = EDITABLE[id];
                            return (
                                <div className="row" key={id}>
                                    <MoveButtons name={nameOf(id)} first={i === 0} last={i === order.length - 1} disabled={busy} onMove={d => moveSection(i, d)} />
                                    <div className="row-main">
                                        <div className="row-title">{nameOf(id)}</div>
                                        <div className="row-sub ct-quote">{desc(id)}</div>
                                    </div>
                                    {edit && <Btn sm kind="ghost" onClick={() => setPanel(edit)} aria-label={`Edit ${nameOf(id)}`}>Edit</Btn>}
                                    <Switch label={`Show ${nameOf(id)}`} checked={shown(id)}
                                        onChange={v => quickSwitch({
                                            value: v, apply: x => applyShown(id, x), save: x => setHomeSectionShown(id, x),
                                            onMsg: `${nameOf(id)} is now showing`, offMsg: `${nameOf(id)} is hidden`,
                                        })} />
                                </div>
                            );
                        })}
                    </div>
                </Card>

                <Card title="Hero slides" action={<Btn sm icon="plus" onClick={() => setSlide("new")}>Add slide</Btn>}>
                    {slides.length === 0 ? (
                        <Empty icon="image" title="No hero slides yet" body="Slides are the large images at the top of the home page. Add one to show it there."
                            action={<Btn kind="primary" icon="plus" onClick={() => setSlide("new")}>Add slide</Btn>} />
                    ) : (
                        <div className="rows">
                            {slides.map((s, i) => (
                                <div className="row" key={s.id}>
                                    <MoveButtons name={`slide ${i + 1}`} first={i === 0} last={i === slides.length - 1} disabled={busy} onMove={d => moveSlide(i, d)} />
                                    <button type="button" className="ct-row-btn row-main" onClick={() => setSlide(s)}>
                                        <span className="hrow">
                                            <Thumb src={s.image_url || null} />
                                            <span className="row-main">
                                                <span className="row-title" style={{ display: "block" }}>{s.headline_line1 || "Untitled slide"}</span>
                                                <span className="row-sub" style={{ display: "block" }}>Button: {s.cta_primary_label}</span>
                                            </span>
                                        </span>
                                    </button>
                                    {!s.enabled && <Badge tone="neutral">Hidden</Badge>}
                                    <Icon n="chev" style={{ width: 16, height: 16, color: "var(--ink-3)" }} />
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {slide && (
                <SlidePanel slide={slide === "new" ? null : slide} onClose={() => setSlide(null)}
                    onSaved={() => { setSlide(null); router.refresh(); }} />
            )}
            {panel === "trust" && <TrustPanel items={data.trustItems} onClose={() => setPanel(null)} onSaved={() => { setPanel(null); router.refresh(); }} />}
            {panel === "categories" && <FeaturedPanel slots={data.featured} categories={data.categories} onClose={() => setPanel(null)} onSaved={() => { setPanel(null); router.refresh(); }} />}
            {panel === "new_arrivals" && <NewArrivalsPanel value={data.newArrivals} categories={data.categories} onClose={() => setPanel(null)} onSaved={() => { setPanel(null); router.refresh(); }} />}
            {panel === "reviews" && <ReviewsSourcePanel source={data.reviews.source} shown={data.reviews.shown} onClose={() => setPanel(null)} onSaved={() => { setPanel(null); router.refresh(); }} />}
            {panel === "newsletter" && <NewsletterPanel value={data.newsletter} onClose={() => setPanel(null)} onSaved={() => { setPanel(null); router.refresh(); }} />}
        </>
    );
}
