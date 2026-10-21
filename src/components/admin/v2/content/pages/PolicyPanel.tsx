"use client";

import { useState } from "react";
import { Btn, Field, IconBtn, Panel, toast } from "@/components/admin/ui";
import { DEFAULT_POLICIES, POLICY_META, type DocSection, type PolicyDoc, type PolicyKey } from "@/lib/content/pageDocs";
import type { SeoIn } from "@/lib/content/adminInput";
import { publishPolicy } from "../actions";
import { AddButton, MoveButtons, SeoCard, run, swap } from "../shared";
import { pageById } from "../pagesList";

export const WRITING_HELP = "Start a line with “- ” to make it a list item. Write [words](/page) to link to a page; email addresses become links by themselves.";

/** One policy page: an opening paragraph and headed sections. */
export function PolicyPanel({ k, doc, seo: seo0, onClose, onSaved }: { k: PolicyKey; doc: PolicyDoc; seo: SeoIn; onClose: () => void; onSaved: () => void }) {
    const meta = POLICY_META[k];
    const page = pageById(k)!;
    const [intro, setIntro] = useState(doc.intro);
    const [sections, setSections] = useState<DocSection[]>(doc.sections.map(s => ({ ...s })));
    const [seo, setSeo] = useState(seo0);
    const [saving, setSaving] = useState(false);
    const upd = (i: number, patch: Partial<DocSection>) => setSections(l => l.map((x, j) => (j === i ? { ...x, ...patch } : x)));
    const empty = !intro.trim() && sections.every(s => !s.heading.trim() && !s.body.trim());

    const publish = async () => {
        setSaving(true);
        const r = await run(publishPolicy(k, { intro, sections }, seo));
        setSaving(false);
        if (!r?.ok) return;
        toast.success(`${meta.name} published`);
        onSaved();
    };
    const useOriginal = () => {
        const d = DEFAULT_POLICIES[k];
        setIntro(d.intro);
        setSections(d.sections.map(s => ({ ...s })));
        toast.info("The original wording is back in the editor. Publish to put it on the shop.");
    };

    return (
        <Panel open wide onClose={onClose} title={meta.name} sub={`misstokyo.shop${meta.path}`}
            footer={<>
                <Btn kind="ghost" onClick={onClose} disabled={saving}>Cancel</Btn>
                <Btn kind="primary" onClick={publish} disabled={saving || empty}>{saving ? "Publishing…" : "Publish"}</Btn>
            </>}>
            <div className="hrow wrap" style={{ justifyContent: "space-between" }}>
                <p className="help grow">{WRITING_HELP}</p>
                <Btn kind="ghost" sm onClick={useOriginal} disabled={saving}>Use the original wording</Btn>
            </div>
            <Field label="Opening paragraph" htmlFor="po-intro">
                <textarea id="po-intro" data-autofocus className="textarea" value={intro} onChange={e => setIntro(e.target.value)} />
            </Field>
            {sections.map((s, i) => (
                <div className="ct-item" key={i}>
                    <div className="grow">
                        <Field label={`Section ${i + 1} heading`} htmlFor={`po-h${i}`}>
                            <input id={`po-h${i}`} className="input" value={s.heading} onChange={e => upd(i, { heading: e.target.value })} />
                        </Field>
                        <Field label="Text" htmlFor={`po-b${i}`}>
                            <textarea id={`po-b${i}`} className="textarea" style={{ minHeight: 120 }} value={s.body} onChange={e => upd(i, { body: e.target.value })} />
                        </Field>
                    </div>
                    <div className="ct-item-tools">
                        <MoveButtons name={`section ${i + 1}`} first={i === 0} last={i === sections.length - 1} onMove={d => setSections(l => swap(l, i, d))} />
                        <IconBtn icon="trash" label={`Remove section ${i + 1}`} onClick={() => setSections(l => l.filter((_, j) => j !== i))} />
                    </div>
                </div>
            ))}
            <div><AddButton label="Add section" onClick={() => setSections(l => [...l, { heading: "", body: "" }])} /></div>
            <SeoCard path={meta.path} value={seo} onChange={setSeo} fallbackTitle={page.seoTitle} />
        </Panel>
    );
}
