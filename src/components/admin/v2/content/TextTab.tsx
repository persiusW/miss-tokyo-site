"use client";

// Content › Shop wording: the site_copy text blocks (searchable, grouped) and,
// as its own view, the site images — the Images / Text split from Site Assets.
import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Badge, Btn, Card, Empty, Field, Icon, Panel, Search, Tabs, Thumb, toast, when } from "@/components/admin/ui";
import { ImageUploader } from "@/components/ui/miss-tokyo/ImageUploader";
import { GROUP_LABELS } from "@/lib/content/wording";
import type { ImageRow, WordingRow } from "./data";
import { saveSiteImage, saveWording } from "./actions";
import { run } from "./shared";

type View = "wording" | "images";
const NOT_ON_SHOP = "Not on the shop";
const groupName = (g: string) => GROUP_LABELS[g] ?? g.replace(/_/g, " ").replace(/^./, c => c.toUpperCase());

export function TextTab({ wording, images, view }: { wording: WordingRow[]; images: ImageRow[]; view: View }) {
    const path = usePathname();
    return (
        <>
            <Tabs label="Shop wording sections" value={view}
                tabs={[{ v: "wording", l: "Text and copy", href: path }, { v: "images", l: "Images", href: `${path}?view=images` }]} />
            {view === "wording" ? <WordingList rows={wording} /> : <ImageList rows={images} />}
        </>
    );
}

function WordingList({ rows }: { rows: WordingRow[] }) {
    const router = useRouter();
    const [q, setQ] = useState("");
    const [edit, setEdit] = useState<WordingRow | null>(null);
    const groups = useMemo(() => {
        const t = q.trim().toLowerCase();
        const hit = rows.filter(r => !t || `${r.label} ${r.value} ${r.key} ${groupName(r.group)}`.toLowerCase().includes(t));
        const by = new Map<string, WordingRow[]>();
        for (const r of hit.filter(r => r.used)) by.set(groupName(r.group), [...(by.get(groupName(r.group)) ?? []), r]);
        // Wording from the old site design that no page shows goes last, on its own.
        const old = hit.filter(r => !r.used);
        return [...by.entries(), ...(old.length ? [[NOT_ON_SHOP, old] as [string, WordingRow[]]] : [])];
    }, [rows, q]);

    return (
        <>
            <Card>
                <div className="list-tools"><Search value={q} onChange={setQ} placeholder="Search shop wording" /></div>
                {groups.length === 0 ? (
                    <Empty icon="search" title={q ? "No wording matches that search" : "No shop wording yet"}
                        body={q ? "Try a word from the text, or clear the search." : "Wording the shop pages read appears here so you can change it."} />
                ) : groups.map(([g, list]) => (
                    <div key={g}>
                        <div className="ct-group-h">{g}</div>
                        {g === NOT_ON_SHOP && <p className="help ct-group-note">Wording from the shop&rsquo;s old design. No page shows it now; each says where that text is edited instead.</p>}
                        <div className="rows">
                            {list.map(r => (
                                <button type="button" key={r.key} className="row click" onClick={() => setEdit(r)}>
                                    <div className="row-main">
                                        <div className="row-title">{r.label}</div>
                                        <div className="row-sub ct-quote">{r.value ? `“${r.value}”` : "Empty"}</div>
                                        {r.note && <div className="row-sub">{r.note}</div>}
                                    </div>
                                    <Icon n="chev" style={{ width: 16, height: 16, color: "var(--ink-3)" }} />
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </Card>
            {edit && <WordingPanel row={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); router.refresh(); }} />}
        </>
    );
}

function WordingPanel({ row, onClose, onSaved }: { row: WordingRow; onClose: () => void; onSaved: () => void }) {
    const [v, setV] = useState(row.value);
    const [saving, setSaving] = useState(false);
    const save = async () => {
        setSaving(true);
        const r = await run(saveWording(row.key, v, { label: row.label, group: row.group }));
        setSaving(false);
        if (!r?.ok) return;
        toast.success("Wording saved");
        onSaved();
    };
    return (
        <Panel open onClose={onClose} title={row.label} sub={row.used ? `Shown on: ${groupName(row.group)}` : "Not on the shop"}
            footer={<>
                <Btn kind="ghost" onClick={onClose} disabled={saving}>Cancel</Btn>
                <Btn kind="primary" onClick={save} disabled={saving || v === row.value}>{saving ? "Saving…" : "Save"}</Btn>
            </>}>
            {row.note && <p className="help">No shop page shows this wording. {row.note}</p>}
            <Field label="Wording" htmlFor="tw" help={row.hint ?? (row.updatedAt ? `Last changed ${when(row.updatedAt)}` : undefined)}>
                <textarea id="tw" data-autofocus className="textarea" value={v} onChange={e => setV(e.target.value)} />
            </Field>
            <div>
                <Btn kind="ghost" sm disabled={row.original == null || v === row.original} onClick={() => row.original != null && setV(row.original)}>Use the original wording</Btn>
                {row.original == null && <p className="help">There&rsquo;s no original wording saved for this one.</p>}
            </div>
        </Panel>
    );
}

function ImageList({ rows }: { rows: ImageRow[] }) {
    const router = useRouter();
    const [edit, setEdit] = useState<ImageRow | null>(null);
    return (
        <>
            <Card title="Site images">
                <div className="rows">
                    {rows.map(r => (
                        <button type="button" key={r.key} className="row click" onClick={() => setEdit(r)}>
                            <Thumb src={r.image_url || null} />
                            <div className="row-main">
                                <div className="row-title">{r.label}</div>
                                <div className="row-sub">{r.group}{r.updatedAt ? ` · Changed ${when(r.updatedAt)}` : " · No image yet"}</div>
                            </div>
                            {!r.used && <Badge tone="neutral">Not on the shop</Badge>}
                            <Icon n="chev" style={{ width: 16, height: 16, color: "var(--ink-3)" }} />
                        </button>
                    ))}
                </div>
            </Card>
            {edit && <ImagePanel row={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); router.refresh(); }} />}
        </>
    );
}

function ImagePanel({ row, onClose, onSaved }: { row: ImageRow; onClose: () => void; onSaved: () => void }) {
    const [f, setF] = useState({ image_url: row.image_url, alt_text: row.alt_text, link_url: row.link_url });
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const save = async () => {
        setSaving(true);
        const r = await run(saveSiteImage(row.key, f));
        setSaving(false);
        if (!r?.ok) return;
        toast.success("Image saved");
        onSaved();
    };
    return (
        <Panel open onClose={onClose} title={row.label} sub={row.group}
            footer={<>
                <Btn kind="ghost" onClick={onClose} disabled={saving}>Cancel</Btn>
                <Btn kind="primary" onClick={save} disabled={saving || uploading}>{saving ? "Saving…" : "Save image"}</Btn>
            </>}>
            {!row.used && <p className="help">No shop page shows this image at the moment. It&rsquo;s kept for when one does.</p>}
            <div className="ct-upl">
                <ImageUploader bucket="site-assets" folder="banners" currentUrl={f.image_url || null} onUploading={setUploading}
                    onUpload={url => setF(p => ({ ...p, image_url: url }))} onRemove={() => setF(p => ({ ...p, image_url: "" }))} aspectRatio="banner" label="Image" />
            </div>
            <Field label="Describe the image" htmlFor="im-alt" help="Read out by screen readers and shown if the image can't load.">
                <input id="im-alt" className="input" value={f.alt_text} onChange={e => setF(p => ({ ...p, alt_text: e.target.value }))} />
            </Field>
            <Field label="Tapping the image goes to" htmlFor="im-link" help="Optional. A page on the shop, e.g. /shop">
                <input id="im-link" className="input" value={f.link_url} onChange={e => setF(p => ({ ...p, link_url: e.target.value }))} />
            </Field>
        </Panel>
    );
}
