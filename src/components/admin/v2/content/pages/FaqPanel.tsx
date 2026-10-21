"use client";

import { useState } from "react";
import { Btn, Field, IconBtn, Panel, toast } from "@/components/admin/ui";
import type { Faq } from "@/content/shopInfo";
import { DEFAULT_FAQS } from "@/lib/content/pageDocs";
import type { SeoIn } from "@/lib/content/adminInput";
import { publishFaq } from "../actions";
import { AddButton, MoveButtons, SeoCard, run, swap } from "../shared";

/** The FAQ page. Ask Miss Tokyo answers from the same questions. */
export function FaqPanel({ items, seo: seo0, onClose, onSaved }: { items: Faq[]; seo: SeoIn; onClose: () => void; onSaved: () => void }) {
    const [list, setList] = useState<Faq[]>(items.map(f => ({ ...f })));
    const [seo, setSeo] = useState(seo0);
    const [saving, setSaving] = useState(false);
    const upd = (i: number, patch: Partial<Faq>) => setList(l => l.map((x, j) => (j === i ? { ...x, ...patch } : x)));
    const sections = [...new Set(list.map(f => f.section).filter(Boolean))];
    const ready = list.some(f => f.question.trim() && f.answer.trim());

    const publish = async () => {
        setSaving(true);
        const r = await run(publishFaq(list, seo));
        setSaving(false);
        if (!r?.ok) return;
        toast.success("FAQ published");
        onSaved();
    };

    return (
        <Panel open wide onClose={onClose} title="FAQ" sub="misstokyo.shop/faq"
            footer={<>
                <Btn kind="ghost" onClick={onClose} disabled={saving}>Cancel</Btn>
                <Btn kind="primary" onClick={publish} disabled={saving || !ready}>{saving ? "Publishing…" : "Publish"}</Btn>
            </>}>
            <div style={{ alignSelf: "flex-end" }}><Btn kind="ghost" sm disabled={saving} onClick={() => { setList(DEFAULT_FAQS.map(f => ({ ...f }))); toast.info("The original questions are back in the editor. Publish to put them on the shop."); }}>Use the original wording</Btn></div>
            <p className="help">Questions are grouped on the page by their section, in the order the sections first appear. Ask Miss Tokyo answers from these too. A question without an answer is left out.</p>
            <datalist id="faq-sections">{sections.map(s => <option key={s} value={s} />)}</datalist>
            {list.map((f, i) => (
                <div className="ct-item" key={i}>
                    <div className="grow">
                        <Field label="Section" htmlFor={`fq-s${i}`}>
                            <input id={`fq-s${i}`} className="input" list="faq-sections" value={f.section} onChange={e => upd(i, { section: e.target.value })} />
                        </Field>
                        <Field label={`Question ${i + 1}`} htmlFor={`fq-q${i}`}>
                            <input id={`fq-q${i}`} className="input" value={f.question} onChange={e => upd(i, { question: e.target.value })} />
                        </Field>
                        <Field label="Answer" htmlFor={`fq-a${i}`}>
                            <textarea id={`fq-a${i}`} className="textarea" value={f.answer} onChange={e => upd(i, { answer: e.target.value })} />
                        </Field>
                    </div>
                    <div className="ct-item-tools">
                        <MoveButtons name={`question ${i + 1}`} first={i === 0} last={i === list.length - 1} onMove={d => setList(l => swap(l, i, d))} />
                        <IconBtn icon="trash" label={`Remove question ${i + 1}`} onClick={() => setList(l => l.filter((_, j) => j !== i))} />
                    </div>
                </div>
            ))}
            <div><AddButton label="Add question" onClick={() => setList(l => [...l, { section: l[l.length - 1]?.section ?? "", question: "", answer: "" }])} /></div>
            <SeoCard path="/faq" value={seo} onChange={setSeo} fallbackTitle="FAQ — Miss Tokyo" />
        </Panel>
    );
}
