"use client";

import { useState } from "react";
import Link from "next/link";
import { Banner, Btn, Panel, RadioCards, plural, toast } from "@/components/admin/ui";
import type { ReviewsSource } from "@/lib/content/homeSections";
import { setReviewsSource } from "../actions";
import { run } from "../shared";

/** Which reviews the home page's Customer reviews section shows. */
export function ReviewsSourcePanel({ source, shown, onClose, onSaved }: { source: ReviewsSource; shown: number; onClose: () => void; onSaved: () => void }) {
    const [v, setV] = useState<ReviewsSource>(source);
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        const r = await run(setReviewsSource(v));
        setSaving(false);
        if (!r?.ok) return;
        toast.success(v === "own" ? "The home page now shows your reviews" : "The home page now shows the Transparent Turtle widget");
        onSaved();
    };

    return (
        <Panel open onClose={onClose} title="Customer reviews" sub="The reviews section on the home page."
            footer={<>
                <Btn kind="ghost" onClick={onClose} disabled={saving}>Cancel</Btn>
                <Btn kind="primary" onClick={save} disabled={saving || v === source}>{saving ? "Saving…" : "Save"}</Btn>
            </>}>
            <RadioCards label="Reviews to show" value={v} onChange={setV} options={[
                { v: "widget", title: "Transparent Turtle widget", desc: "Shows the review widget from your Transparent Turtle account. Reviews are managed there." },
                { v: "own", title: "Your reviews", desc: `Shows the reviews in Content › Reviews that are switched on: ${plural(shown, "review")} now, three to a row.` },
            ]} />
            {v === "own" && shown === 0 && (
                <Banner tone="warn" title="No reviews are switched on">
                    The section stays empty until you switch one on in <Link href="/content/reviews" className="link-btn">Content › Reviews</Link>.
                </Banner>
            )}
        </Panel>
    );
}
