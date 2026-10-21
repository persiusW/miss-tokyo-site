"use client";

// Riders (was Settings › Riders). Changes here save straight away, as they
// did on the old tab: add, edit (name, phone, bike registration, photo),
// available on/off, and delete as a two-tap.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Btn, Empty, Field, Panel, Switch, Thumb, TwoTap, plural, toast } from "@/components/admin/ui";
import { ImageUploader } from "@/components/ui/miss-tokyo/ImageUploader";
import { addRider, deleteRider, setRiderActive, updateRider } from "./actions";
import type { Rider } from "./load";

type Form = { full_name: string; phone_number: string; bike_reg: string; image_url: string };
const EMPTY: Form = { full_name: "", phone_number: "", bike_reg: "", image_url: "" };

export function RidersPanel({ open, onClose, riders }: { open: boolean; onClose: () => void; riders: Rider[] }) {
    const router = useRouter();
    const [list, setList] = useState(riders);
    const [edit, setEdit] = useState<Rider | "new" | null>(null);
    const [form, setForm] = useState<Form>(EMPTY);
    const [busy, setBusy] = useState(false);
    const [synced, setSynced] = useState(riders);
    if (synced !== riders) { setSynced(riders); setList(riders); }

    const startEdit = (r: Rider | "new") => {
        setEdit(r);
        setForm(r === "new" ? EMPTY : { full_name: r.full_name, phone_number: r.phone_number, bike_reg: r.bike_reg ?? "", image_url: r.image_url ?? "" });
    };

    const toggle = async (r: Rider, on: boolean) => {
        setList(l => l.map(x => (x.id === r.id ? { ...x, is_active: on } : x)));
        const res = await setRiderActive(r.id, on);
        if (!res.ok) {
            setList(l => l.map(x => (x.id === r.id ? { ...x, is_active: !on } : x)));
            toast.error(res.error);
            return;
        }
        toast.success(on ? `${r.full_name} can be assigned` : `${r.full_name} won't be offered for deliveries`);
        router.refresh();
    };

    const save = async () => {
        if (!edit) return;
        setBusy(true);
        const res = edit === "new" ? await addRider(form) : await updateRider(edit.id, form);
        setBusy(false);
        if (!res.ok) { toast.error(res.error); return; }
        toast.success(edit === "new" ? `${form.full_name.trim()} added` : "Rider saved");
        setEdit(null);
        router.refresh();
    };

    const remove = async (r: Rider) => {
        setBusy(true);
        const res = await deleteRider(r.id);
        setBusy(false);
        if (!res.ok) { toast.error(res.error); return; }
        toast.success(`${r.full_name} deleted`);
        setList(l => l.filter(x => x.id !== r.id));
        setEdit(null);
        router.refresh();
    };

    const active = list.filter(r => r.is_active).length;

    return (
        <>
            <Panel open={open && !edit} onClose={onClose} title="Riders"
                sub={`${plural(list.length, "rider")} · ${active} available. Changes here save straight away.`}
                footerLeft={<Btn icon="plus" onClick={() => startEdit("new")}>Add a rider</Btn>}
                footer={<Btn kind="primary" onClick={onClose}>Done</Btn>}>
                {list.length === 0
                    ? <Empty icon="truck" title="No riders yet" body="Riders you add here can be assigned to deliveries and get the delivery text." action={<Btn kind="primary" icon="plus" onClick={() => startEdit("new")}>Add a rider</Btn>} />
                    : <div className="card inset"><div className="rows">
                        {list.map(r => (
                            <div className="row" key={r.id}>
                                <Thumb src={r.image_url} label={r.full_name.slice(0, 1)} alt="" />
                                <div className="row-main">
                                    <div className="row-title">{r.full_name}</div>
                                    <div className="row-sub">{[r.phone_number, r.bike_reg].filter(Boolean).join(" · ")}{r.is_active ? "" : " · Not available"}</div>
                                </div>
                                <Btn sm kind="ghost" onClick={() => startEdit(r)} aria-label={`Edit ${r.full_name}`}>Edit</Btn>
                                <Switch label={`${r.full_name} available`} checked={r.is_active} onChange={on => void toggle(r, on)} />
                            </div>
                        ))}
                    </div></div>}
            </Panel>
            <Panel open={open && !!edit} onClose={() => setEdit(null)} title={edit === "new" ? "Add a rider" : "Edit rider"}
                sub="They can be assigned to deliveries and get the delivery text."
                footerLeft={edit && edit !== "new" ? <TwoTap label="Delete rider" onConfirm={() => void remove(edit)} disabled={busy} /> : undefined}
                footer={<><Btn kind="ghost" onClick={() => setEdit(null)} disabled={busy}>Cancel</Btn><Btn kind="primary" onClick={() => void save()} disabled={busy}>{busy ? "Saving…" : edit === "new" ? "Add rider" : "Save rider"}</Btn></>}>
                <Field label="Full name" htmlFor="rd-name"><input id="rd-name" className="input" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} autoComplete="off" /></Field>
                <Field label="Phone" htmlFor="rd-phone" help="The delivery text goes to this number."><input id="rd-phone" className="input" inputMode="tel" placeholder="+233" value={form.phone_number} onChange={e => setForm({ ...form, phone_number: e.target.value })} /></Field>
                <Field label="Bike registration" htmlFor="rd-bike" help="Optional."><input id="rd-bike" className="input" value={form.bike_reg} onChange={e => setForm({ ...form, bike_reg: e.target.value })} /></Field>
                <div className="field">
                    <span className="label">Photo</span>
                    <div className="set-logo"><ImageUploader bucket="product-images" folder="riders" currentUrl={form.image_url || null} aspectRatio="square" onUpload={(url: string) => setForm(f => ({ ...f, image_url: url }))} /></div>
                    <div className="help">Optional. Helps staff pick the right person.</div>
                </div>
            </Panel>
        </>
    );
}
