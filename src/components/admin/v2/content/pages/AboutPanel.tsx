"use client";

// The About page: every section the old About Page tab had (top of page,
// numbers, story and quote, timeline, values with icons, team, last section),
// published together from the footer.
import { useState } from "react";
import { Btn, Field, IconBtn, Panel, Select, toast } from "@/components/admin/ui";
import { ImageUploader } from "@/components/ui/miss-tokyo/ImageUploader";
import { ABOUT_ICONS, type AboutIn, type AboutTextKey, type SeoIn } from "@/lib/content/adminInput";
import type { AboutTeamMember, AboutTimelineEntry, AboutValue } from "@/types/settings";
import { publishAbout } from "../actions";
import { AddButton, MoveButtons, SeoCard, run, swap } from "../shared";

type Tab = "top" | "numbers" | "story" | "timeline" | "values" | "team" | "end" | "seo";
const TABS: { v: Tab; l: string }[] = [
    { v: "top", l: "Top of page" }, { v: "numbers", l: "Numbers" }, { v: "story", l: "Story" }, { v: "timeline", l: "Timeline" },
    { v: "values", l: "Values" }, { v: "team", l: "Team" }, { v: "end", l: "Last section" }, { v: "seo", l: "Search engines" },
];
const ICON_NAMES: Record<string, string> = {
    heart: "Heart", shield: "Shield", users: "People", globe: "Globe", message: "Speech bubble", "trending-up": "Rising line",
    star: "Star", zap: "Lightning", award: "Award", "check-circle": "Tick",
};
const TEAM_COLORS = ["#1a1a1a", "#b5956a", "#6b7280", "#7c3aed", "#059669", "#dc2626", "#2563eb", "#d97706"];

export function AboutPanel({ value, seo: seo0, onClose, onSaved }: { value: AboutIn; seo: SeoIn; onClose: () => void; onSaved: () => void }) {
    const [f, setF] = useState<AboutIn>({ ...value, about_timeline: value.about_timeline.map(x => ({ ...x })), about_values: value.about_values.map(x => ({ ...x })), about_team: value.about_team.map(x => ({ ...x })) });
    const [seo, setSeo] = useState(seo0);
    const [tab, setTab] = useState<Tab>("top");
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(0);

    const text = (k: AboutTextKey, label: string, opts: { area?: boolean; help?: string; placeholder?: string } = {}) => (
        <Field label={label} htmlFor={`ab-${k}`} help={opts.help}>
            {opts.area
                ? <textarea id={`ab-${k}`} className="textarea" value={f[k]} placeholder={opts.placeholder} onChange={e => setF(p => ({ ...p, [k]: e.target.value }))} />
                : <input id={`ab-${k}`} className="input" value={f[k]} placeholder={opts.placeholder} onChange={e => setF(p => ({ ...p, [k]: e.target.value }))} />}
        </Field>
    );
    const listUpd = <K extends "about_timeline" | "about_values" | "about_team">(k: K, i: number, patch: Partial<AboutIn[K][number]>) =>
        setF(p => ({ ...p, [k]: (p[k] as AboutIn[K][number][]).map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
    const listDel = (k: "about_timeline" | "about_values" | "about_team", i: number) => setF(p => ({ ...p, [k]: (p[k] as unknown[]).filter((_, j) => j !== i) }));
    const listMove = (k: "about_timeline" | "about_values" | "about_team", i: number, d: -1 | 1) => setF(p => ({ ...p, [k]: swap(p[k] as unknown[], i, d) }));

    const publish = async () => {
        setSaving(true);
        const r = await run(publishAbout(f, seo));
        setSaving(false);
        if (!r?.ok) return;
        toast.success("About page published");
        onSaved();
    };

    return (
        <Panel open wide onClose={onClose} title="About" sub="misstokyo.shop/about" tabs={TABS} tab={tab} onTab={setTab}
            footer={<>
                <Btn kind="ghost" onClick={onClose} disabled={saving}>Cancel</Btn>
                <Btn kind="primary" onClick={publish} disabled={saving || uploading > 0}>{saving ? "Publishing…" : "Publish"}</Btn>
            </>}>
            {tab === "top" && <>
                {text("about_eyebrow", "Small line above the heading", { placeholder: "Our story" })}
                <div className="grid-2">
                    {text("about_headline_line1", "Heading line 1", { placeholder: "Born in Accra." })}
                    {text("about_headline_line2", "Heading line 2", { placeholder: "Dressed for Everywhere." })}
                </div>
                {text("about_manifesto_p1", "Paragraph 1", { area: true })}
                {text("about_manifesto_p2", "Paragraph 2", { area: true })}
                {text("about_manifesto_p3", "Paragraph 3", { area: true })}
            </>}

            {tab === "numbers" && <>
                <p className="help">Three numbers shown side by side, e.g. “240+ Styles in store”.</p>
                {([1, 2, 3] as const).map(n => (
                    <div className="ct-item" key={n}>
                        <div className="grow">
                            <div className="section-t">Number {n}</div>
                            <div className="grid-2">
                                {text(`about_stat_${n}_value` as AboutTextKey, "Number", { placeholder: "240+" })}
                                {text(`about_stat_${n}_label` as AboutTextKey, "What it counts", { placeholder: "Styles in store" })}
                            </div>
                        </div>
                    </div>
                ))}
            </>}

            {tab === "story" && <>
                {text("about_story_heading", "Section heading", { placeholder: "The Miss Tokyo Story" })}
                {text("about_story_p1", "Story paragraph 1", { area: true })}
                {text("about_story_p2", "Story paragraph 2", { area: true })}
                <div className="section-t">Pull quote</div>
                {text("about_quote_text", "Quote", { area: true })}
                {text("about_quote_author", "Who said it", { placeholder: "Miss Tokyo Team" })}
            </>}

            {tab === "timeline" && <>
                {f.about_timeline.length === 0 && <p className="help">No timeline entries yet. Add the moments in the shop&rsquo;s story, each with a year.</p>}
                {f.about_timeline.map((e: AboutTimelineEntry, i) => (
                    <div className="ct-item" key={i}>
                        <div className="grow">
                            <div className="grid-2">
                                <Field label="Year" htmlFor={`tl-y${i}`}><input id={`tl-y${i}`} className="input" value={e.year} placeholder="2019" onChange={x => listUpd("about_timeline", i, { year: x.target.value })} /></Field>
                                <Field label="Title" htmlFor={`tl-t${i}`}><input id={`tl-t${i}`} className="input" value={e.title} placeholder="We opened our doors" onChange={x => listUpd("about_timeline", i, { title: x.target.value })} /></Field>
                            </div>
                            <Field label="Text" htmlFor={`tl-b${i}`}><textarea id={`tl-b${i}`} className="textarea" value={e.body} onChange={x => listUpd("about_timeline", i, { body: x.target.value })} /></Field>
                        </div>
                        <div className="ct-item-tools">
                            <MoveButtons name={`entry ${i + 1}`} first={i === 0} last={i === f.about_timeline.length - 1} onMove={d => listMove("about_timeline", i, d)} />
                            <IconBtn icon="trash" label={`Remove entry ${i + 1}`} onClick={() => listDel("about_timeline", i)} />
                        </div>
                    </div>
                ))}
                <div><AddButton label="Add entry" onClick={() => setF(p => ({ ...p, about_timeline: [...p.about_timeline, { year: "", title: "", body: "" }] }))} /></div>
            </>}

            {tab === "values" && <>
                {f.about_values.length === 0 && <p className="help">No values yet. Add what the shop stands for, each with an icon.</p>}
                {f.about_values.map((v: AboutValue, i) => (
                    <div className="ct-item" key={i}>
                        <div className="grow">
                            <div className="grid-2">
                                <Field label="Icon" htmlFor={`va-i${i}`}>
                                    <Select id={`va-i${i}`} value={v.icon} onChange={x => listUpd("about_values", i, { icon: x })}
                                        options={ABOUT_ICONS.map(ic => ({ v: ic, l: ICON_NAMES[ic] ?? ic }))} />
                                </Field>
                                <Field label="Title" htmlFor={`va-t${i}`}><input id={`va-t${i}`} className="input" value={v.title} placeholder="Quality first" onChange={x => listUpd("about_values", i, { title: x.target.value })} /></Field>
                            </div>
                            <Field label="Text" htmlFor={`va-b${i}`}><textarea id={`va-b${i}`} className="textarea" value={v.body} onChange={x => listUpd("about_values", i, { body: x.target.value })} /></Field>
                        </div>
                        <div className="ct-item-tools">
                            <MoveButtons name={`value ${i + 1}`} first={i === 0} last={i === f.about_values.length - 1} onMove={d => listMove("about_values", i, d)} />
                            <IconBtn icon="trash" label={`Remove value ${i + 1}`} onClick={() => listDel("about_values", i)} />
                        </div>
                    </div>
                ))}
                <div><AddButton label="Add value" onClick={() => setF(p => ({ ...p, about_values: [...p.about_values, { icon: "heart", title: "", body: "" }] }))} /></div>
            </>}

            {tab === "team" && <>
                {f.about_team.length === 0 && <p className="help">No team members yet. A member without a name is left out when you publish.</p>}
                {f.about_team.map((m: AboutTeamMember, i) => (
                    <div className="ct-item" key={i}>
                        <div className="grow">
                            <div className="grid-2">
                                <Field label="Name" htmlFor={`tm-n${i}`}><input id={`tm-n${i}`} className="input" value={m.name} placeholder="Jane Doe" onChange={x => listUpd("about_team", i, { name: x.target.value })} /></Field>
                                <Field label="Role" htmlFor={`tm-r${i}`}><input id={`tm-r${i}`} className="input" value={m.role} placeholder="Creative Director" onChange={x => listUpd("about_team", i, { role: x.target.value })} /></Field>
                            </div>
                            <Field label="About them" htmlFor={`tm-b${i}`}><textarea id={`tm-b${i}`} className="textarea" value={m.bio} onChange={x => listUpd("about_team", i, { bio: x.target.value })} /></Field>
                            <div className="grid-2">
                                <div className="field">
                                    <span className="label" id={`tm-c${i}`}>Colour behind their initials</span>
                                    <div className="ct-swatches" role="radiogroup" aria-labelledby={`tm-c${i}`}>
                                        {TEAM_COLORS.map(c => (
                                            <button key={c} type="button" role="radio" aria-checked={m.avatar_color === c} aria-label={`Colour ${c}`} className="ct-swatch" onClick={() => listUpd("about_team", i, { avatar_color: c })}>
                                                <span style={{ background: c }} />
                                            </button>
                                        ))}
                                    </div>
                                    <div className="hrow-sm" style={{ marginTop: 4 }}>
                                        <input type="color" aria-label="Any colour" value={/^#[0-9a-f]{6}$/i.test(m.avatar_color) ? m.avatar_color : "#1a1a1a"} onChange={x => listUpd("about_team", i, { avatar_color: x.target.value })}
                                            style={{ width: 44, height: 44, border: 0, background: "transparent", padding: 0, cursor: "pointer" }} />
                                        <span className="help">Or pick any colour</span>
                                    </div>
                                </div>
                                <div className="ct-upl">
                                    <ImageUploader bucket="site-assets" folder="about/team" currentUrl={m.photo_url || null}
                                        onUploading={u => setUploading(n => Math.max(0, n + (u ? 1 : -1)))}
                                        onUpload={url => listUpd("about_team", i, { photo_url: url })} onRemove={() => listUpd("about_team", i, { photo_url: "" })}
                                        aspectRatio="square" label="Photo (optional)" />
                                </div>
                            </div>
                        </div>
                        <div className="ct-item-tools">
                            <MoveButtons name={m.name || `member ${i + 1}`} first={i === 0} last={i === f.about_team.length - 1} onMove={d => listMove("about_team", i, d)} />
                            <IconBtn icon="trash" label={`Remove ${m.name || `member ${i + 1}`}`} onClick={() => listDel("about_team", i)} />
                        </div>
                    </div>
                ))}
                <div><AddButton label="Add team member" onClick={() => setF(p => ({ ...p, about_team: [...p.about_team, { name: "", role: "", bio: "", avatar_color: "#1a1a1a", photo_url: "" }] }))} /></div>
            </>}

            {tab === "end" && <>
                {text("about_cta_eyebrow", "Small line above the heading", { placeholder: "Ready to shop?" })}
                {text("about_cta_headline", "Heading", { placeholder: "Start Your Miss Tokyo Journey" })}
                {text("about_cta_body", "Text", { area: true })}
                <div className="grid-2">
                    {text("about_cta_btn_label", "Button label", { placeholder: "Shop Now" })}
                    {text("about_cta_btn_url", "Button goes to", { placeholder: "/shop", help: "A page on the shop, e.g. /shop" })}
                </div>
            </>}

            {tab === "seo" && <SeoCard path="/about" value={seo} onChange={setSeo} fallbackTitle="About — Miss Tokyo" />}
        </Panel>
    );
}
