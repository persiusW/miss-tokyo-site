"use client";

import { useState } from "react";
import { Btn, Field, IconBtn, Panel, Seg, Select, toast } from "@/components/admin/ui";
import type { CarouselTab } from "@/lib/content/adminInput";
import type { Category, HomeData } from "../data";
import { saveNewArrivals } from "../actions";
import { AddButton, MoveButtons, run, swap } from "../shared";

const MAX_TABS = 4;

/** The home page's New Arrivals carousel: title, category, how many, and its tabs. */
export function NewArrivalsPanel({ value, categories, onClose, onSaved }: { value: HomeData["newArrivals"]; categories: Category[]; onClose: () => void; onSaved: () => void }) {
    const [title, setTitle] = useState(value.title);
    const [categoryId, setCategoryId] = useState(value.categoryId ?? "");
    const [limit, setLimit] = useState(String(value.limit));
    const [tabs, setTabs] = useState<CarouselTab[]>(value.tabs.map(t => ({ ...t })));
    const [saving, setSaving] = useState(false);
    const n = Number(limit);
    const limitOk = Number.isInteger(n) && n >= 4 && n <= 16;
    const updTab = (i: number, patch: Partial<CarouselTab>) => setTabs(l => l.map((x, j) => (j === i ? { ...x, ...patch } : x)));
    // A saved category that has been switched off since stays selectable, so it isn't lost silently.
    const catOptions = [{ v: "", l: "All products" }, ...categories.map(c => ({ v: c.id, l: c.name }))];
    if (categoryId && !categories.some(c => c.id === categoryId)) catOptions.push({ v: categoryId, l: "A category that's switched off" });

    const save = async () => {
        setSaving(true);
        const r = await run(saveNewArrivals({ title, categoryId: categoryId || null, limit: n, tabs }));
        setSaving(false);
        if (!r?.ok) return;
        toast.success("New arrivals saved");
        onSaved();
    };

    return (
        <Panel open wide onClose={onClose} title="New arrivals" sub="The product carousel on the home page."
            footer={<>
                <Btn kind="ghost" onClick={onClose} disabled={saving}>Cancel</Btn>
                <Btn kind="primary" onClick={save} disabled={saving || !limitOk}>{saving ? "Saving…" : "Save new arrivals"}</Btn>
            </>}>
            <Field label="Section title" htmlFor="na-t" help="The last word is set in italics on the shop.">
                <input id="na-t" className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="New Arrivals" />
            </Field>
            <div className="grid-2">
                <Field label="Products from" htmlFor="na-c" help="Used by every tab that doesn't pick its own category.">
                    <Select id="na-c" value={categoryId} onChange={setCategoryId} options={catOptions} />
                </Field>
                <Field label="How many products" htmlFor="na-n" error={limitOk ? null : "Between 4 and 16."} help="Between 4 and 16 in each tab. Four show at a time.">
                    <input id="na-n" className="input" inputMode="numeric" value={limit} onChange={e => setLimit(e.target.value.replace(/\D/g, ""))} />
                </Field>
            </div>
            <div>
                <div className="section-t">Tabs</div>
                <p className="help">With one tab the carousel shows on its own. With two or more, customers tap a tab name above the products. A tab with no products is left out.</p>
            </div>
            {tabs.map((t, i) => (
                <div className="ct-item" key={i}>
                    <div className="grow">
                        <div className="grid-3">
                            <Field label={`Tab ${i + 1} name`} htmlFor={`na-tl${i}`} help={tabs.length === 1 ? "Not shown with one tab." : undefined}>
                                <input id={`na-tl${i}`} className="input" value={t.label} onChange={e => updTab(i, { label: e.target.value })} placeholder="New In" />
                            </Field>
                            <Field label="Order">
                                <Seg label={`Tab ${i + 1} order`} value={t.mode} onChange={v => updTab(i, { mode: v })}
                                    options={[{ v: "newest", l: "Newest first" }, { v: "sort_order", l: "Shop order" }]} />
                            </Field>
                            <Field label="Category" htmlFor={`na-tc${i}`}>
                                <Select id={`na-tc${i}`} value={t.category_name} onChange={v => updTab(i, { category_name: v })}
                                    options={[{ v: "", l: "Same as above" }, ...categories.map(c => ({ v: c.name, l: c.name })),
                                        ...(t.category_name && !categories.some(c => c.name === t.category_name) ? [{ v: t.category_name, l: `${t.category_name} (switched off)` }] : [])]} />
                            </Field>
                        </div>
                    </div>
                    {tabs.length > 1 && (
                        <div className="ct-item-tools">
                            <MoveButtons name={`tab ${i + 1}`} first={i === 0} last={i === tabs.length - 1} onMove={d => setTabs(l => swap(l, i, d))} />
                            <IconBtn icon="trash" label={`Remove tab ${i + 1}`} onClick={() => setTabs(l => l.filter((_, j) => j !== i))} />
                        </div>
                    )}
                </div>
            ))}
            {tabs.length < MAX_TABS && (
                <div><AddButton label="Add tab" onClick={() => setTabs(l => [...l, { label: "", mode: "sort_order", category_name: "" }])} /></div>
            )}
            <p className="help">“Shop order” is the order set in Products (it was called Bestsellers).</p>
        </Panel>
    );
}
