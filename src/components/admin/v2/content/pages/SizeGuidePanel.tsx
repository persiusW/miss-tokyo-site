"use client";

import { useState } from "react";
import { Btn, Card, Field, IconBtn, Panel, toast } from "@/components/admin/ui";
import { DEFAULT_SIZE_GUIDE_PAGE, type MeasureTip, type SizeGuidePage, type SizeRowIn } from "@/lib/content/pageDocs";
import type { ModalSizeRow, SeoIn } from "@/lib/content/adminInput";
import { publishSizeGuide } from "../actions";
import { AddButton, SeoCard, run } from "../shared";

// The product page pop-up's own sizes (SizeGuideModal), for "Use the original sizes".
const MODAL_ORIGINAL: ModalSizeRow[] = [
    { label: "XS — 6", bust: "80–83", waist: "62–65", hips: "88–91" },
    { label: "S — 8", bust: "84–87", waist: "66–69", hips: "92–95" },
    { label: "M — 10", bust: "88–91", waist: "70–73", hips: "96–99" },
    { label: "L — 12", bust: "92–96", waist: "74–78", hips: "100–104" },
    { label: "XL — 14", bust: "97–102", waist: "79–84", hips: "105–110" },
    { label: "XXL — 16", bust: "103–110", waist: "85–92", hips: "111–118" },
];

type Col<T> = { k: keyof T & string; l: string };

function SizeTable<T extends Record<string, string>>({ rows, cols, onChange, name }: { rows: T[]; cols: Col<T>[]; onChange: (r: T[]) => void; name: string }) {
    return (
        <div className="tbl-wrap">
            <table className="ct-grid-tbl">
                <thead><tr>{cols.map(c => <th key={c.k} scope="col">{c.l}</th>)}<th><span className="sr">Remove</span></th></tr></thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={i}>
                            {cols.map(c => (
                                <td key={c.k}>
                                    <input className="input" aria-label={`${name} row ${i + 1}: ${c.l}`} value={r[c.k]}
                                        onChange={e => onChange(rows.map((x, j) => (j === i ? { ...x, [c.k]: e.target.value } : x)))} />
                                </td>
                            ))}
                            <td><IconBtn icon="trash" label={`Remove ${name} row ${i + 1}`} onClick={() => onChange(rows.filter((_, j) => j !== i))} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/** The size guide page (inches) and the size table in the product page pop-up (cm). */
export function SizeGuidePanel({ page, modalRows, seo: seo0, onClose, onSaved }: { page: SizeGuidePage; modalRows: ModalSizeRow[]; seo: SeoIn; onClose: () => void; onSaved: () => void }) {
    const [note, setNote] = useState(page.note);
    const [rows, setRows] = useState<SizeRowIn[]>(page.rows.map(r => ({ ...r })));
    const [measure, setMeasure] = useState<MeasureTip[]>(page.measure.map(m => ({ ...m })));
    const [fitNote, setFitNote] = useState(page.fitNote);
    const [modal, setModal] = useState<ModalSizeRow[]>(modalRows.map(r => ({ ...r })));
    const [seo, setSeo] = useState(seo0);
    const [saving, setSaving] = useState(false);
    const ready = rows.some(r => r.label.trim()) && modal.some(r => r.label.trim());

    const publish = async () => {
        setSaving(true);
        const r = await run(publishSizeGuide({ page: { note, rows, measure, fitNote }, modalRows: modal }, seo));
        setSaving(false);
        if (!r?.ok) return;
        toast.success("Size guide published");
        onSaved();
    };
    const original = () => {
        const d = DEFAULT_SIZE_GUIDE_PAGE;
        setNote(d.note); setRows(d.rows.map(r => ({ ...r }))); setMeasure(d.measure.map(m => ({ ...m }))); setFitNote(d.fitNote);
        setModal(MODAL_ORIGINAL.map(r => ({ ...r })));
        toast.info("The original sizes are back in the editor. Publish to put them on the shop.");
    };

    return (
        <Panel open wide onClose={onClose} title="Size guide" sub="misstokyo.shop/size-guide and the Size Guide pop-up on product pages"
            footer={<>
                <Btn kind="ghost" onClick={onClose} disabled={saving}>Cancel</Btn>
                <Btn kind="primary" onClick={publish} disabled={saving || !ready}>{saving ? "Publishing…" : "Publish"}</Btn>
            </>}>
            <div style={{ alignSelf: "flex-end" }}><Btn kind="ghost" sm onClick={original} disabled={saving}>Use the original sizes</Btn></div>
            <Card inset title="Size guide page (inches)">
                <div className="card-body stack">
                    <Field label="Line under the title" htmlFor="sg-note">
                        <input id="sg-note" data-autofocus className="input" value={note} onChange={e => setNote(e.target.value)} />
                    </Field>
                    <SizeTable name="Size guide page" rows={rows} onChange={setRows}
                        cols={[{ k: "label", l: "Size" }, { k: "bust", l: "Bust" }, { k: "waist", l: "Waist" }, { k: "hip", l: "Hip" }]} />
                    <div><AddButton label="Add size" onClick={() => setRows(l => [...l, { label: "", bust: "", waist: "", hip: "" }])} /></div>
                    <div className="section-t">How to measure</div>
                    {measure.map((m, i) => (
                        <div className="hrow" key={i} style={{ alignItems: "flex-start" }}>
                            <div className="grow stack-sm">
                                <input className="input" aria-label={`Measurement ${i + 1} name`} value={m.label} onChange={e => setMeasure(l => l.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                                <textarea className="textarea" style={{ minHeight: 64 }} aria-label={`How to measure ${m.label || `measurement ${i + 1}`}`} value={m.desc}
                                    onChange={e => setMeasure(l => l.map((x, j) => (j === i ? { ...x, desc: e.target.value } : x)))} />
                            </div>
                            <IconBtn icon="trash" label={`Remove measurement ${i + 1}`} onClick={() => setMeasure(l => l.filter((_, j) => j !== i))} />
                        </div>
                    ))}
                    <div><AddButton label="Add measurement" onClick={() => setMeasure(l => [...l, { label: "", desc: "" }])} /></div>
                    <Field label="Fit note" htmlFor="sg-fit" help="Shown in a box under the chart. Ask Miss Tokyo uses it too.">
                        <textarea id="sg-fit" className="textarea" value={fitNote} onChange={e => setFitNote(e.target.value)} />
                    </Field>
                </div>
            </Card>
            <Card inset title="Size table on product pages (cm)">
                <div className="card-body stack">
                    <p className="help">The “Size Guide” pop-up next to the size picker on every product page. Measurements are in centimetres.</p>
                    <SizeTable name="Product page" rows={modal} onChange={setModal}
                        cols={[{ k: "label", l: "Size" }, { k: "bust", l: "Bust (cm)" }, { k: "waist", l: "Waist (cm)" }, { k: "hips", l: "Hips (cm)" }]} />
                    <div><AddButton label="Add size" onClick={() => setModal(l => [...l, { label: "", bust: "", waist: "", hips: "" }])} /></div>
                    <p className="help">You can add rows for regional sizes (e.g. EU 36, UK 8) or remove sizes you don&rsquo;t sell.</p>
                </div>
            </Card>
            <SeoCard path="/size-guide" value={seo} onChange={setSeo} fallbackTitle="Size Guide — Miss Tokyo" />
        </Panel>
    );
}
