"use client";

import { useState } from "react";
import { Banner, Btn, Field, Panel, Seg, Select, toast } from "@/components/admin/ui";
import { NEW_ARRIVALS_SHOWN } from "@/lib/content/homeLayout";
import type { CarouselTab } from "@/lib/content/adminInput";
import type { Category, HomeData } from "../data";
import { saveNewArrivals } from "../actions";
import { run } from "../shared";

/** The new-arrivals settings and carousel tabs, kept from the old CMS. */
export function NewArrivalsPanel({ value, categories, onClose, onSaved }: { value: HomeData["newArrivals"]; categories: Category[]; onClose: () => void; onSaved: () => void }) {
    const [title, setTitle] = useState(value.title);
    const [categoryId, setCategoryId] = useState(value.categoryId ?? "");
    const [limit, setLimit] = useState(String(value.limit));
    const [tabs, setTabs] = useState<CarouselTab[]>(value.tabs.map(t => ({ ...t })));
    const [saving, setSaving] = useState(false);
    const n = Number(limit);
    const limitOk = Number.isInteger(n) && n >= 4 && n <= 16;
    const updTab = (i: number, patch: Partial<CarouselTab>) => setTabs(l => l.map((x, j) => (j === i ? { ...x, ...patch } : x)));

    const save = async () => {
        setSaving(true);
        const r = await run(saveNewArrivals({ title, categoryId: categoryId || null, limit: n, tabs }));
        setSaving(false);
        if (!r?.ok) return;
        toast.success("New arrivals saved");
        onSaved();
    };

    return (
        <Panel open wide onClose={onClose} title="New arrivals" sub="The carousel of the newest products on the home page."
            footer={<>
                <Btn kind="ghost" onClick={onClose} disabled={saving}>Cancel</Btn>
                <Btn kind="primary" onClick={save} disabled={saving || !limitOk}>{saving ? "Saving…" : "Save new arrivals"}</Btn>
            </>}>
            <Banner tone="info" title="The shop doesn't use these settings yet">
                {`The home page shows the ${NEW_ARRIVALS_SHOWN} newest products under “New Arrivals”. These settings are kept so they're ready when the carousel reads them.`}
            </Banner>
            <Field label="Section title" htmlFor="na-t">
                <input id="na-t" className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="New Arrivals" />
            </Field>
            <div className="grid-2">
                <Field label="Only from this category" htmlFor="na-c">
                    <Select id="na-c" value={categoryId} onChange={setCategoryId}
                        options={[{ v: "", l: "Latest products, no filter" }, ...categories.map(c => ({ v: c.id, l: c.name }))]} />
                </Field>
                <Field label="How many products" htmlFor="na-n" error={limitOk ? null : "Between 4 and 16."} help="Between 4 and 16.">
                    <input id="na-n" className="input" inputMode="numeric" value={limit} onChange={e => setLimit(e.target.value.replace(/\D/g, ""))} />
                </Field>
            </div>
            <div className="section-t">Carousel tabs</div>
            {tabs.map((t, i) => (
                <div className="ct-item" key={i}>
                    <div className="grow">
                        <div className="grid-3">
                            <Field label={`Tab ${i + 1} label`} htmlFor={`na-tl${i}`}>
                                <input id={`na-tl${i}`} className="input" value={t.label} onChange={e => updTab(i, { label: e.target.value })} placeholder="New In" />
                            </Field>
                            <Field label="Order">
                                <Seg label={`Tab ${i + 1} order`} value={t.mode} onChange={v => updTab(i, { mode: v })}
                                    options={[{ v: "newest", l: "Newest first" }, { v: "sort_order", l: "Shop order" }]} />
                            </Field>
                            <Field label="Category" htmlFor={`na-tc${i}`}>
                                <Select id={`na-tc${i}`} value={t.category_name} onChange={v => updTab(i, { category_name: v })}
                                    options={[{ v: "", l: "All products" }, ...categories.map(c => ({ v: c.name, l: c.name }))]} />
                            </Field>
                        </div>
                    </div>
                </div>
            ))}
            <p className="help">“Shop order” is the order set in Products (it was called Bestsellers).</p>
        </Panel>
    );
}
