"use client";

// Content › Reviews: the customer reviews kept for the home page.
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ReviewsSource } from "@/lib/content/homeSections";
import { Banner, Btn, Card, Empty, Field, Panel, Seg, SRow, Switch, TwoTap, toast } from "@/components/admin/ui";
import type { Review } from "./data";
import { deleteReview, reorderReviews, saveReview, setReviewShown } from "./actions";
import { MoveButtons, quickSwitch, run, swap } from "./shared";

const COLORS = ["#C4896A", "#8B5CF6", "#059669", "#DC2626", "#2563EB", "#D97706", "#EC4899", "#6B7280"];

function Stars({ n }: { n: number }) {
    return <span className="ct-stars" aria-label={`${n} out of 5 stars`}>{"★".repeat(n)}<span className="off">{"★".repeat(5 - n)}</span></span>;
}

export function ReviewsTab({ reviews, source }: { reviews: Review[]; source: ReviewsSource }) {
    const router = useRouter();
    const [list, setList] = useState(reviews);
    const [open, setOpen] = useState<Review | "new" | null>(null);
    const [busy, setBusy] = useState(false);
    const [seen, setSeen] = useState(reviews);
    if (seen !== reviews) { setSeen(reviews); setList(reviews); }

    const move = async (i: number, d: -1 | 1) => {
        const before = list;
        const next = swap(list, i, d);
        setList(next);
        setBusy(true);
        const r = await run(reorderReviews(next.map(x => x.id)));
        setBusy(false);
        if (!r?.ok) { setList(before); return; }
        toast.success("Review order saved", {
            action: { label: "Undo", onClick: async () => { setList(before); const u = await run(reorderReviews(before.map(x => x.id))); if (!u?.ok) setList(next); } },
        });
    };

    return (
        <>
            {source === "own" ? (
                <Banner tone="info" title="These reviews show on the home page">
                    The ones switched on show in this order, three to a row. To show the Transparent Turtle widget instead, change it in <Link href="/content" className="link-btn">Home page › Customer reviews</Link>.
                </Banner>
            ) : (
                <Banner tone="info" title="The home page shows the Transparent Turtle widget">
                    These reviews are kept ready. To show them instead of the widget, choose “Your reviews” in <Link href="/content" className="link-btn">Home page › Customer reviews</Link>.
                </Banner>
            )}
            <Card title="Customer reviews" action={<Btn sm icon="plus" onClick={() => setOpen("new")}>Add review</Btn>}>
                {list.length === 0 ? (
                    <Empty icon="star" title="No reviews yet" body="Add a review from a customer with their name, a star rating and what they said."
                        action={<Btn kind="primary" icon="plus" onClick={() => setOpen("new")}>Add review</Btn>} />
                ) : (
                    <div className="rows">
                        {list.map((x, i) => (
                            <div className="row" key={x.id}>
                                <MoveButtons name={`review from ${x.reviewer_name}`} first={i === 0} last={i === list.length - 1} disabled={busy} onMove={d => move(i, d)} />
                                <button type="button" className="ct-row-btn row-main" onClick={() => setOpen(x)}>
                                    <span className="row-title" style={{ display: "block" }}><Stars n={x.star_rating} /> · {x.reviewer_name}{x.reviewer_location ? <span className="muted"> · {x.reviewer_location}</span> : null}</span>
                                    <span className="row-sub ct-quote">{x.review_text ? `“${x.review_text}”` : "No text yet"}</span>
                                </button>
                                <Switch label={`Show review from ${x.reviewer_name}`} checked={x.enabled}
                                    onChange={v => quickSwitch({
                                        value: v, apply: on => setList(l => l.map(y => (y.id === x.id ? { ...y, enabled: on } : y))), save: on => setReviewShown(x.id, on),
                                        onMsg: "Review is now showing", offMsg: "Review is hidden",
                                    })} />
                            </div>
                        ))}
                    </div>
                )}
            </Card>
            {open && <ReviewPanel review={open === "new" ? null : open} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); router.refresh(); }} />}
        </>
    );
}

function ReviewPanel({ review, onClose, onSaved }: { review: Review | null; onClose: () => void; onSaved: () => void }) {
    const [f, setF] = useState(review ? { ...review } : {
        enabled: true, reviewer_name: "", reviewer_location: "", avatar_initials: "", avatar_color: COLORS[0], star_rating: 5, review_text: "",
    });
    const [saving, setSaving] = useState(false);
    const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(p => ({ ...p, [k]: v }));

    const save = async () => {
        setSaving(true);
        const r = await run(saveReview(f));
        setSaving(false);
        if (!r?.ok) return;
        toast.success(review ? "Review saved" : "Review added");
        onSaved();
    };
    const remove = async () => {
        if (!review) return;
        setSaving(true);
        const r = await run(deleteReview(review.id));
        setSaving(false);
        if (!r?.ok) return;
        toast.success("Review deleted");
        onSaved();
    };

    return (
        <Panel open onClose={onClose} title={review ? `Review from ${review.reviewer_name}` : "Add review"}
            footerLeft={review && <TwoTap label="Delete review" onConfirm={remove} disabled={saving} />}
            footer={<>
                <Btn kind="ghost" onClick={onClose} disabled={saving}>Cancel</Btn>
                <Btn kind="primary" onClick={save} disabled={saving || !f.reviewer_name.trim()}>{saving ? "Saving…" : "Save review"}</Btn>
            </>}>
            <div className="grid-2">
                <Field label="Name shown" htmlFor="rv-n">
                    <input id="rv-n" data-autofocus className="input" value={f.reviewer_name} onChange={e => set("reviewer_name", e.target.value)} placeholder="Amara O." />
                </Field>
                <Field label="Where they're from" htmlFor="rv-l" help="Optional.">
                    <input id="rv-l" className="input" value={f.reviewer_location} onChange={e => set("reviewer_location", e.target.value)} placeholder="Accra" />
                </Field>
            </div>
            <Field label="Rating">
                <Seg label="Rating" value={String(f.star_rating)} onChange={v => set("star_rating", Number(v))}
                    options={["1", "2", "3", "4", "5"].map(v => ({ v, l: `${v}★` }))} />
            </Field>
            <Field label="Review" htmlFor="rv-t">
                <textarea id="rv-t" className="textarea" value={f.review_text} onChange={e => set("review_text", e.target.value)} placeholder="What the customer said" />
            </Field>
            <div className="grid-2">
                <Field label="Initials on the avatar" htmlFor="rv-i" help="Up to 2 letters.">
                    <div className="hrow">
                        <span className="ct-avatar" style={{ background: f.avatar_color }} aria-hidden="true">{f.avatar_initials || "?"}</span>
                        <input id="rv-i" className="input" maxLength={2} value={f.avatar_initials} onChange={e => set("avatar_initials", e.target.value.toUpperCase())} />
                    </div>
                </Field>
                <div className="field">
                    <span className="label" id="rv-col">Avatar colour</span>
                    <div className="ct-swatches" role="radiogroup" aria-labelledby="rv-col">
                        {COLORS.map(c => (
                            <button key={c} type="button" role="radio" aria-checked={f.avatar_color === c} aria-label={`Colour ${c}`} className="ct-swatch" onClick={() => set("avatar_color", c)}>
                                <span style={{ background: c }} />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <Card inset>
                <SRow label="Show this review" help="Hidden reviews are kept for later.">
                    <Switch label="Show this review" checked={f.enabled} onChange={v => set("enabled", v)} />
                </SRow>
            </Card>
        </Panel>
    );
}
