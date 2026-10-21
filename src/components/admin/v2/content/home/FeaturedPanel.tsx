"use client";

import { useState } from "react";
import { Btn, Field, Panel, SRow, Select, Switch, toast } from "@/components/admin/ui";
import type { Category, FeaturedSlot } from "../data";
import { saveFeaturedCategories } from "../actions";
import { run } from "../shared";

/** Up to four categories in the home page grid, each with an optional label and item count. */
export function FeaturedPanel({ slots, categories, onClose, onSaved }: { slots: FeaturedSlot[]; categories: Category[]; onClose: () => void; onSaved: () => void }) {
    const [list, setList] = useState(slots.map(s => ({ ...s })));
    const [saving, setSaving] = useState(false);
    const upd = (i: number, patch: Partial<FeaturedSlot>) => setList(l => l.map((x, j) => (j === i ? { ...x, ...patch } : x)));
    const options = [{ v: "", l: "None" }, ...categories.map(c => ({ v: c.id, l: c.name }))];

    const save = async () => {
        setSaving(true);
        const r = await run(saveFeaturedCategories(list));
        setSaving(false);
        if (!r?.ok) return;
        toast.success("Featured categories saved");
        onSaved();
    };

    return (
        <Panel open wide onClose={onClose} title="Featured categories" sub="Up to four categories in the grid on the home page, in this order."
            footer={<>
                <Btn kind="ghost" onClick={onClose} disabled={saving}>Cancel</Btn>
                <Btn kind="primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save categories"}</Btn>
            </>}>
            {list.map((s, i) => (
                <div className="ct-item" key={i}>
                    <div className="grow">
                        <div className="section-t">Place {i + 1}</div>
                        <div className="grid-3">
                            <Field label="Category" htmlFor={`fc-c${i}`}>
                                <Select id={`fc-c${i}`} value={s.category_id ?? ""} options={options} onChange={v => upd(i, { category_id: v || null })} />
                            </Field>
                            <Field label="Label shown" htmlFor={`fc-l${i}`} help="Leave empty to use the category name.">
                                <input id={`fc-l${i}`} className="input" value={s.custom_label} onChange={e => upd(i, { custom_label: e.target.value })} />
                            </Field>
                            <Field label="Item count shown" htmlFor={`fc-n${i}`} help="Leave empty to count the products.">
                                <input id={`fc-n${i}`} className="input" inputMode="numeric" value={s.item_count_override ?? ""} placeholder="Automatic"
                                    onChange={e => { const d = e.target.value.replace(/\D/g, ""); upd(i, { item_count_override: d ? Number(d) : null }); }} />
                            </Field>
                        </div>
                        <SRow label="Show this place">
                            <Switch label={`Show place ${i + 1}`} checked={s.enabled} onChange={v => upd(i, { enabled: v })} />
                        </SRow>
                    </div>
                </div>
            ))}
        </Panel>
    );
}
