"use client";

import { useState } from "react";
import { Btn, Card, Field, Icon, Money, Panel, SRow, Switch, toast } from "@/components/admin/ui";
import type { GiftCardSettingsIn, SeoIn } from "@/lib/content/adminInput";
import { publishGiftCardsPage } from "../actions";
import { SeoCard, run } from "../shared";

/** The gift cards page's settings (was CMS › Gift Cards). */
export function GiftCardsPanel({ value, seo: seo0, onClose, onSaved }: { value: GiftCardSettingsIn; seo: SeoIn; onClose: () => void; onSaved: () => void }) {
    const [enabled, setEnabled] = useState(value.gc_enabled);
    const [min, setMin] = useState(String(value.gc_min_amount));
    const [max, setMax] = useState(String(value.gc_max_amount));
    const [presets, setPresets] = useState<number[]>(value.gc_preset_amounts);
    const [add, setAdd] = useState("");
    const [never, setNever] = useState(value.gc_never_expires);
    const [days, setDays] = useState(String(value.gc_validity_days));
    const [note, setNote] = useState(value.gc_delivery_note);
    const [seo, setSeo] = useState(seo0);
    const [saving, setSaving] = useState(false);
    const minN = Number(min), maxN = Number(max), daysN = Number(days);
    const rangeErr = !(minN > 0) || !(maxN > 0) ? "Enter both amounts." : minN > maxN ? "The smallest amount can't be more than the largest." : null;
    const daysErr = !never && !(Number.isInteger(daysN) && daysN >= 1) ? "Enter a number of days." : null;

    const addPreset = () => {
        const v = Number(add);
        if (v > 0 && !presets.includes(v)) setPresets(p => [...p, v].sort((a, b) => a - b));
        setAdd("");
    };
    const publish = async () => {
        setSaving(true);
        const r = await run(publishGiftCardsPage({
            gc_enabled: enabled, gc_min_amount: minN, gc_max_amount: maxN, gc_preset_amounts: presets,
            gc_never_expires: never, gc_validity_days: daysN || 365, gc_delivery_note: note,
        }, seo));
        setSaving(false);
        if (!r?.ok) return;
        toast.success("Gift cards page published");
        onSaved();
    };

    return (
        <Panel open wide onClose={onClose} title="Gift cards page" sub="misstokyo.shop/gift-cards"
            footer={<>
                <Btn kind="ghost" onClick={onClose} disabled={saving}>Cancel</Btn>
                <Btn kind="primary" onClick={publish} disabled={saving || !!rangeErr || !!daysErr}>{saving ? "Publishing…" : "Publish"}</Btn>
            </>}>
            <Card inset>
                <SRow label="Sell gift cards online" help="When off, the gift cards page shows “Coming soon”.">
                    <Switch label="Sell gift cards online" checked={enabled} onChange={setEnabled} />
                </SRow>
            </Card>
            <div className="grid-2">
                <Field label="Smallest amount" htmlFor="gc-min" error={rangeErr}>
                    <Money id="gc-min" value={min} onChange={setMin} />
                </Field>
                <Field label="Largest amount" htmlFor="gc-max">
                    <Money id="gc-max" value={max} onChange={setMax} />
                </Field>
            </div>
            <div className="field">
                <span className="label">Amounts to pick from</span>
                <div className="ct-chips">
                    {presets.map(v => (
                        <span key={v} className="chip-x">GH₵ {v.toLocaleString("en-GB")}
                            <button type="button" aria-label={`Remove GH₵ ${v}`} onClick={() => setPresets(p => p.filter(x => x !== v))}><Icon n="x" style={{ width: 12, height: 12 }} /></button>
                        </span>
                    ))}
                </div>
                <div className="hrow-sm" style={{ marginTop: 8 }}>
                    <div style={{ width: 180 }}>
                        <Money value={add} onChange={setAdd} label="Amount to add" placeholder="e.g. 150" />
                    </div>
                    <Btn sm icon="plus" onClick={addPreset} disabled={!(Number(add) > 0)}>Add amount</Btn>
                </div>
                <div className="help">Customers tap one of these or type their own amount between the smallest and largest.</div>
            </div>
            <Card inset>
                <SRow label="Gift cards never expire" help="When off, set how many days a card can be used for.">
                    <Switch label="Gift cards never expire" checked={never} onChange={setNever} />
                </SRow>
                {!never && (
                    <div className="card-body">
                        <Field label="Days a card can be used" htmlFor="gc-days" error={daysErr}>
                            <input id="gc-days" className="input" inputMode="numeric" style={{ maxWidth: 160 }} value={days} onChange={e => setDays(e.target.value.replace(/\D/g, ""))} />
                        </Field>
                    </div>
                )}
            </Card>
            <Field label="Delivery note" htmlFor="gc-note" help="Shown at the top of the gift cards page.">
                <textarea id="gc-note" className="textarea" value={note} onChange={e => setNote(e.target.value)} />
            </Field>
            <SeoCard path="/gift-cards" value={seo} onChange={setSeo} fallbackTitle="Gift Cards — Miss Tokyo" />
        </Panel>
    );
}
