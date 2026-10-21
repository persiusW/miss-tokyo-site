"use client";

// One setting row: the label and help on the left, the control on the right
// (SettingRow). Rows that need a panel or a live card get it from the page.
import type { ReactNode } from "react";
import { Badge, Btn, BtnLink, Chip, Money, Percent, RadioCards, Seg, Select, SRow, Switch, TagEditor, toast } from "@/components/admin/ui";
import { ImageUploader } from "@/components/ui/miss-tokyo/ImageUploader";
import { rowId, type Ctx, type Row, type Val, type Values } from "./schema";

type Props = {
    row: Row;
    v: Values;
    set: (k: string, v: Val) => void;
    ctx: Ctx;
    hl: string | null;
    categories: { id: string; name: string }[];
    go: (href: string) => void;
    /** Rows the page draws itself (riders, messages, AI use, push, …). */
    special?: ReactNode;
};

const str = (x: Val | undefined) => (typeof x === "string" ? x : "");

export function RowControl({ row, v, set, ctx, hl, categories, go, special }: Props) {
    const id = "set-" + row.k.replace(/[^a-z0-9]+/gi, "-");
    const disabled = row.needs ? v[row.needs] !== true : false;
    const val = v[row.k];
    const common = { id: rowId(row.k), hl: hl === row.k || (!!row.k2 && hl === row.k2) };
    const label = <label htmlFor={id}>{row.label}</label>;
    const help = row.help;

    switch (row.type) {
        case "head":
            return (
                <div className="set-head" id={common.id}>
                    <div className="section-t">{row.label}</div>
                    {row.help && <div className="srow-help">{row.help}</div>}
                </div>
            );
        case "text":
            return (
                <SRow {...common} label={label} help={help}>
                    <input id={id} className="input" value={str(val)} disabled={disabled} maxLength={row.max} placeholder={row.placeholder}
                        type={row.k === "site.instagram_access_token" ? "password" : "text"} autoComplete="off"
                        onChange={e => set(row.k, e.target.value)} />
                </SRow>
            );
        case "textarea":
            return (
                <SRow {...common} label={label} help={help} stacked>
                    <textarea id={id} className="textarea" value={str(val)} disabled={disabled} maxLength={row.max} style={{ minHeight: 84, width: "100%" }}
                        onChange={e => set(row.k, e.target.value)} />
                    {row.max && <span className="xs muted set-count">{str(val).length} / {row.max}</span>}
                </SRow>
            );
        case "switch":
            return <SRow {...common} label={label} help={help}><Switch id={id} label={row.label} checked={val === true} disabled={disabled} onChange={x => set(row.k, x)} /></SRow>;
        case "money":
            return <SRow {...common} label={label} help={help}><div style={{ width: 180 }}><Money id={id} label={row.label} value={str(val)} disabled={disabled} onChange={x => set(row.k, x)} /></div></SRow>;
        case "pct":
            return <SRow {...common} label={label} help={help}><Percent id={id} label={row.label} value={str(val)} onChange={x => set(row.k, x)} /></SRow>;
        case "num":
            return (
                <SRow {...common} label={label} help={help}>
                    <input id={id} className="input set-num" inputMode="numeric" value={str(val)} disabled={disabled}
                        onChange={e => set(row.k, e.target.value.replace(/\D/g, ""))} />
                </SRow>
            );
        case "range": {
            const k2 = row.k2!;
            return (
                <SRow {...common} label={<span id={id}>{row.label}</span>} help={help}>
                    <span className="hrow-sm" role="group" aria-labelledby={id}>
                        <input className="input set-num" inputMode="numeric" aria-label={`${row.label} starts at`} value={str(val)} disabled={disabled}
                            onChange={e => set(row.k, e.target.value.replace(/\D/g, ""))} />
                        <span className="muted sm">to</span>
                        <input className="input set-num" inputMode="numeric" aria-label={`${row.label} ends at`} value={str(v[k2])} disabled={disabled}
                            onChange={e => set(k2, e.target.value.replace(/\D/g, ""))} />
                        <span className="muted sm">pieces</span>
                    </span>
                </SRow>
            );
        }
        case "select": {
            const sel = <Select id={id} label={row.label} value={str(val)} disabled={disabled} onChange={x => set(row.k, x)} options={(row.opts ?? []).map(([a, b]) => ({ v: a, l: b }))} />;
            return (
                <SRow {...common} label={label} help={help}>
                    {row.k === "store.pos_hold_minutes" ? <span data-assist="settings.pos-hold">{sel}</span> : sel}
                </SRow>
            );
        }
        case "seg":
            return <SRow {...common} label={<span id={id}>{row.label}</span>} help={help}><Seg label={row.label} value={str(val)} onChange={x => set(row.k, x)} options={(row.opts ?? []).map(([a, b]) => ({ v: a, l: b }))} /></SRow>;
        case "radio":
            return (
                <SRow {...common} label={row.label} help={help} stacked>
                    <RadioCards label={row.label} value={str(val)} onChange={x => set(row.k, x)} options={(row.opts ?? []).map(([a, b, c]) => ({ v: a, title: b, desc: c }))} />
                </SRow>
            );
        case "tags":
            return (
                <SRow {...common} label={row.label} help={help} stacked>
                    <TagEditor label={row.label} values={Array.isArray(val) ? val : []} onChange={x => set(row.k, x)} placeholder="Add one" />
                </SRow>
            );
        case "cats": {
            const picked = new Set(Array.isArray(val) ? val : []);
            return (
                <SRow {...common} label={row.label} help={help} stacked>
                    {categories.length === 0
                        ? <p className="sm muted">No active categories yet. Add them in Products › Categories.</p>
                        : <div className="hrow-sm wrap" role="group" aria-label={row.label}>
                            {categories.map(c => (
                                <Chip key={c.id} pressed={picked.has(c.id)} onClick={() => {
                                    const next = new Set(picked);
                                    if (next.has(c.id)) next.delete(c.id); else next.add(c.id);
                                    set(row.k, [...next]);
                                }}>{c.name}</Chip>
                            ))}
                        </div>}
                </SRow>
            );
        }
        case "status": {
            const s = row.status?.(ctx);
            return <SRow {...common} label={row.label} help={help}>{s && <Badge tone={s.tone}>{s.text}</Badge>}</SRow>;
        }
        case "link": {
            const href = row.href?.(ctx);
            if (!href) return null;
            return <SRow {...common} label={row.label} help={help}><Btn sm onClick={() => go(href)}>Open</Btn></SRow>;
        }
        case "logo":
            return (
                <SRow {...common} label={row.label} help={help} stacked>
                    <div className="set-logo">
                        <ImageUploader bucket="site-assets" folder="logos" currentUrl={str(val) || null} aspectRatio="square"
                            onUpload={(url: string) => set(row.k, url)} />
                    </div>
                </SRow>
            );
        case "rss": {
            const url = `https://${ctx.domain}/rss.xml`;
            return (
                <SRow {...common} label={row.label} help={help}>
                    <span className="hrow-sm wrap">
                        <code className="set-code">{url}</code>
                        <Btn sm icon="copy" onClick={() => { void navigator.clipboard?.writeText(url).then(() => toast.success("Feed link copied"), () => toast.error("Couldn't copy. Select the link and copy it.")); }}>Copy</Btn>
                    </span>
                </SRow>
            );
        }
        case "payout":
            return (
                <SRow {...common} label={row.label} help={help}>
                    <BtnLink sm href="https://dashboard.paystack.com/#/settings/preferences" external icon="link">Open Paystack</BtnLink>
                </SRow>
            );
        default:
            return <SRow {...common} label={row.label} help={help} stacked={row.type === "messages" || row.type === "push-template" || row.type === "aiuse"}>{special}</SRow>;
    }
}
