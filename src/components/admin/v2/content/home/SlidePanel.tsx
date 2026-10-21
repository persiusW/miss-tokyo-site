"use client";

import { useState } from "react";
import { Btn, Card, Field, Panel, SRow, Switch, TwoTap, toast } from "@/components/admin/ui";
import { ImageUploader } from "@/components/ui/miss-tokyo/ImageUploader";
import type { Slide } from "../data";
import { deleteSlide, saveSlide } from "../actions";
import { run } from "../shared";

const BLANK: Omit<Slide, "id" | "position"> = {
    enabled: true, eyebrow: "", headline_line1: "", headline_line2: "", headline_line3: "", body_text: "",
    cta_primary_label: "Shop Now", cta_primary_url: "/shop", cta_secondary_label: "", cta_secondary_url: "",
    image_url: "", overlay_opacity: 0.45,
};

/** Add or edit one hero slide. Saves from the footer. */
export function SlidePanel({ slide, onClose, onSaved }: { slide: Slide | null; onClose: () => void; onSaved: () => void }) {
    const [f, setF] = useState(slide ? { ...slide } : { ...BLANK });
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(p => ({ ...p, [k]: v }));

    const save = async () => {
        setSaving(true);
        const r = await run(saveSlide(f));
        setSaving(false);
        if (!r?.ok) return;
        toast.success(slide ? "Slide saved" : "Slide added");
        onSaved();
    };
    const remove = async () => {
        if (!slide) return;
        setSaving(true);
        const r = await run(deleteSlide(slide.id));
        setSaving(false);
        if (!r?.ok) return;
        toast.success("Slide deleted");
        onSaved();
    };

    return (
        <Panel open onClose={onClose} title={slide ? "Edit slide" : "Add slide"} sub="Large image at the top of the home page."
            footerLeft={slide && <TwoTap label="Delete slide" onConfirm={remove} disabled={saving} />}
            footer={<>
                <Btn kind="ghost" onClick={onClose} disabled={saving}>Cancel</Btn>
                <Btn kind="primary" onClick={save} disabled={saving || uploading || !f.headline_line1.trim()}>{saving ? "Saving…" : "Save slide"}</Btn>
            </>}>
            <div className="ct-upl">
                <ImageUploader bucket="site-assets" folder="hero-slides" currentUrl={f.image_url || null}
                    onUpload={url => set("image_url", url)} onRemove={() => set("image_url", "")} onUploading={setUploading}
                    aspectRatio="video" label="Image" />
                <p className="help" style={{ marginTop: 8 }}>Landscape, at least 2400 × 1200. On phones the centre is kept.</p>
            </div>
            <Field label="Small line above the heading" htmlFor="sl-eye" help="Optional, e.g. “New collection”.">
                <input id="sl-eye" className="input" value={f.eyebrow} onChange={e => set("eyebrow", e.target.value)} />
            </Field>
            <Field label="Heading" htmlFor="sl-h1" help="The first line of the heading. Required.">
                <input id="sl-h1" data-autofocus className="input" value={f.headline_line1} onChange={e => set("headline_line1", e.target.value)} />
            </Field>
            <div className="grid-2">
                <Field label="Heading line 2" htmlFor="sl-h2" help="Shown in gold italics.">
                    <input id="sl-h2" className="input" value={f.headline_line2} onChange={e => set("headline_line2", e.target.value)} />
                </Field>
                <Field label="Heading line 3" htmlFor="sl-h3">
                    <input id="sl-h3" className="input" value={f.headline_line3} onChange={e => set("headline_line3", e.target.value)} />
                </Field>
            </div>
            <Field label="Text under the heading" htmlFor="sl-body">
                <textarea id="sl-body" className="textarea" value={f.body_text} onChange={e => set("body_text", e.target.value)} />
            </Field>
            <div className="grid-2">
                <Field label="Button label" htmlFor="sl-b1">
                    <input id="sl-b1" className="input" value={f.cta_primary_label} onChange={e => set("cta_primary_label", e.target.value)} />
                </Field>
                <Field label="Button goes to" htmlFor="sl-u1" help="A page on the shop, e.g. /shop?category=dresses">
                    <input id="sl-u1" className="input" value={f.cta_primary_url} onChange={e => set("cta_primary_url", e.target.value)} />
                </Field>
            </div>
            <div className="grid-2">
                <Field label="Second button label" htmlFor="sl-b2" help="Leave empty to hide the second button.">
                    <input id="sl-b2" className="input" value={f.cta_secondary_label} onChange={e => set("cta_secondary_label", e.target.value)} />
                </Field>
                <Field label="Second button goes to" htmlFor="sl-u2">
                    <input id="sl-u2" className="input" value={f.cta_secondary_url} onChange={e => set("cta_secondary_url", e.target.value)} placeholder="/about" />
                </Field>
            </div>
            <Field label={`Darken the image: ${Math.round(f.overlay_opacity * 100)}%`} htmlFor="sl-ov" help="More darkening makes the heading easier to read.">
                <input id="sl-ov" type="range" className="ct-range" min={0} max={1} step={0.05} value={f.overlay_opacity}
                    onChange={e => set("overlay_opacity", parseFloat(e.target.value))} />
            </Field>
            <Card inset>
                <SRow label="Show this slide" help="Hidden slides are kept for later.">
                    <Switch label="Show this slide" checked={f.enabled} onChange={v => set("enabled", v)} />
                </SRow>
            </Card>
        </Panel>
    );
}
