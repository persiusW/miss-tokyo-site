"use client";

import { useState } from "react";
import { Btn, Empty, IconBtn, Panel, Switch, toast } from "@/components/admin/ui";
import type { TrustItem } from "@/lib/content/adminInput";
import { saveTrustItems } from "../actions";
import { AddButton, MoveButtons, run, swap } from "../shared";

/** The promise strip's messages (was the Trust bar). */
export function TrustPanel({ items, onClose, onSaved }: { items: TrustItem[]; onClose: () => void; onSaved: () => void }) {
    const [list, setList] = useState<TrustItem[]>(items.map(i => ({ ...i })));
    const [saving, setSaving] = useState(false);
    const upd = (i: number, patch: Partial<TrustItem>) => setList(l => l.map((x, j) => (j === i ? { ...x, ...patch } : x)));

    const save = async () => {
        setSaving(true);
        const r = await run(saveTrustItems(list));
        setSaving(false);
        if (!r?.ok) return;
        toast.success("Promise strip saved");
        onSaved();
    };

    return (
        <Panel open onClose={onClose} title="Promise strip" sub="The thin strip of short promises under the hero, e.g. “Free pickup in Osu”."
            footer={<>
                <Btn kind="ghost" onClick={onClose} disabled={saving}>Cancel</Btn>
                <Btn kind="primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save promise strip"}</Btn>
            </>}>
            {list.length === 0 && <Empty icon="spark" title="No messages yet" body="Add a short promise and it will show in the strip on every visit." />}
            {list.map((it, i) => (
                <div className="ct-item" key={it.id}>
                    <MoveButtons name={`message ${i + 1}`} first={i === 0} last={i === list.length - 1} onMove={d => setList(l => swap(l, i, d))} />
                    <div className="grow">
                        <input className="input" aria-label={`Message ${i + 1}`} value={it.text} placeholder="Free delivery on orders over GH₵ 200"
                            onChange={e => upd(i, { text: e.target.value })} />
                    </div>
                    <Switch label={`Show message ${i + 1}`} checked={it.enabled} onChange={v => upd(i, { enabled: v })} />
                    <IconBtn icon="trash" label={`Remove message ${i + 1}`} onClick={() => setList(l => l.filter((_, j) => j !== i))} />
                </div>
            ))}
            <div><AddButton label="Add message" onClick={() => setList(l => [...l, { id: crypto.randomUUID(), text: "", enabled: true }])} /></div>
            <p className="help">Empty messages are left out when you save. Removing one only takes effect when you save.</p>
        </Panel>
    );
}
