"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { ChevronDown, ChevronUp, Plus, Trash2, GripVertical } from "lucide-react";
import type { AboutTimelineEntry, AboutValue, AboutTeamMember } from "@/types/settings";

// ── Accordion wrapper ─────────────────────────────────────────────────────────
function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
    const [open, setOpen] = useState(true);
    return (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-6 py-4 border-b border-neutral-100 hover:bg-neutral-50 transition-colors"
            >
                <span className="text-xs font-semibold uppercase tracking-widest text-neutral-600">{title}</span>
                {open ? <ChevronUp size={14} className="text-neutral-400" /> : <ChevronDown size={14} className="text-neutral-400" />}
            </button>
            {open && <div className="p-6">{children}</div>}
        </div>
    );
}

// ── Field helpers ─────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-1.5">{label}</label>
            {children}
        </div>
    );
}

const inputCls = "w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-black transition-colors bg-white";
const textareaCls = `${inputCls} resize-y min-h-[80px]`;

function SaveButton({ saving, onClick }: { saving: boolean; onClick: () => void }) {
    return (
        <div className="pt-4 flex justify-end border-t border-neutral-100 mt-4">
            <button
                type="button"
                onClick={onClick}
                disabled={saving}
                className="px-6 py-2.5 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50 rounded-lg"
            >
                {saving ? "Saving…" : "Save"}
            </button>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────
export function AboutPageTab() {
    // Hero
    const [eyebrow, setEyebrow] = useState("");
    const [headLine1, setHeadLine1] = useState("");
    const [headLine2, setHeadLine2] = useState("");
    const [p1, setP1] = useState("");
    const [p2, setP2] = useState("");
    const [p3, setP3] = useState("");

    // Stats
    const [stat1Value, setStat1Value] = useState("");
    const [stat1Label, setStat1Label] = useState("");
    const [stat2Value, setStat2Value] = useState("");
    const [stat2Label, setStat2Label] = useState("");
    const [stat3Value, setStat3Value] = useState("");
    const [stat3Label, setStat3Label] = useState("");

    // Story
    const [storyHeading, setStoryHeading] = useState("");
    const [storyP1, setStoryP1] = useState("");
    const [storyP2, setStoryP2] = useState("");
    const [quoteText, setQuoteText] = useState("");
    const [quoteAuthor, setQuoteAuthor] = useState("");

    // Timeline
    const [timeline, setTimeline] = useState<AboutTimelineEntry[]>([]);

    // Values
    const [values, setValues] = useState<AboutValue[]>([]);

    // Team
    const [team, setTeam] = useState<AboutTeamMember[]>([]);

    // CTA
    const [ctaEyebrow, setCtaEyebrow] = useState("");
    const [ctaHeadline, setCtaHeadline] = useState("");
    const [ctaBody, setCtaBody] = useState("");
    const [ctaBtnLabel, setCtaBtnLabel] = useState("");
    const [ctaBtnUrl, setCtaBtnUrl] = useState("");

    // Saving state per section
    const [savingHero, setSavingHero] = useState(false);
    const [savingStats, setSavingStats] = useState(false);
    const [savingStory, setSavingStory] = useState(false);
    const [savingTimeline, setSavingTimeline] = useState(false);
    const [savingValues, setSavingValues] = useState(false);
    const [savingTeam, setSavingTeam] = useState(false);
    const [savingCta, setSavingCta] = useState(false);

    useEffect(() => {
        supabase
            .from("site_settings")
            .select("*")
            .eq("id", "singleton")
            .single()
            .then(({ data: s }) => {
                if (!s) return;
                setEyebrow(s.about_eyebrow ?? "");
                setHeadLine1(s.about_headline_line1 ?? "");
                setHeadLine2(s.about_headline_line2 ?? "");
                setP1(s.about_manifesto_p1 ?? "");
                setP2(s.about_manifesto_p2 ?? "");
                setP3(s.about_manifesto_p3 ?? "");
                setStat1Value(s.about_stat_1_value ?? "");
                setStat1Label(s.about_stat_1_label ?? "");
                setStat2Value(s.about_stat_2_value ?? "");
                setStat2Label(s.about_stat_2_label ?? "");
                setStat3Value(s.about_stat_3_value ?? "");
                setStat3Label(s.about_stat_3_label ?? "");
                setStoryHeading(s.about_story_heading ?? "");
                setStoryP1(s.about_story_p1 ?? "");
                setStoryP2(s.about_story_p2 ?? "");
                setQuoteText(s.about_quote_text ?? "");
                setQuoteAuthor(s.about_quote_author ?? "");
                setTimeline((s.about_timeline as AboutTimelineEntry[]) ?? []);
                setValues((s.about_values as AboutValue[]) ?? []);
                setTeam((s.about_team as AboutTeamMember[]) ?? []);
                setCtaEyebrow(s.about_cta_eyebrow ?? "");
                setCtaHeadline(s.about_cta_headline ?? "");
                setCtaBody(s.about_cta_body ?? "");
                setCtaBtnLabel(s.about_cta_btn_label ?? "");
                setCtaBtnUrl(s.about_cta_btn_url ?? "");
            });
    }, []);

    async function save(payload: Record<string, unknown>, setSaving: (v: boolean) => void) {
        setSaving(true);
        const { error } = await supabase
            .from("site_settings")
            .update(payload)
            .eq("id", "singleton");
        setSaving(false);
        if (error) { toast.error("Failed to save."); return; }
        toast.success("Saved.");
    }

    // ── Timeline helpers ──────────────────────────────────────────────────────
    function addTimelineEntry() {
        setTimeline(t => [...t, { year: "", title: "", body: "" }]);
    }
    function removeTimelineEntry(i: number) {
        setTimeline(t => t.filter((_, idx) => idx !== i));
    }
    function updateTimeline(i: number, field: keyof AboutTimelineEntry, val: string) {
        setTimeline(t => t.map((e, idx) => idx === i ? { ...e, [field]: val } : e));
    }

    // ── Values helpers ────────────────────────────────────────────────────────
    const ICON_OPTIONS = ["heart", "shield", "users", "globe", "message", "trending-up", "star", "zap", "award", "check-circle"];
    function addValue() {
        setValues(v => [...v, { icon: "heart", title: "", body: "" }]);
    }
    function removeValue(i: number) {
        setValues(v => v.filter((_, idx) => idx !== i));
    }
    function updateValue(i: number, field: keyof AboutValue, val: string) {
        setValues(v => v.map((e, idx) => idx === i ? { ...e, [field]: val } : e));
    }

    // ── Team helpers ──────────────────────────────────────────────────────────
    const AVATAR_COLORS = ["#1a1a1a", "#b5956a", "#6b7280", "#7c3aed", "#059669", "#dc2626", "#2563eb", "#d97706"];
    function addTeamMember() {
        setTeam(t => [...t, { name: "", role: "", bio: "", avatar_color: "#1a1a1a", photo_url: "" }]);
    }
    function removeTeamMember(i: number) {
        setTeam(t => t.filter((_, idx) => idx !== i));
    }
    function updateTeam(i: number, field: keyof AboutTeamMember, val: string) {
        setTeam(t => t.map((e, idx) => idx === i ? { ...e, [field]: val } : e));
    }

    return (
        <div className="space-y-4 max-w-3xl">

            {/* HERO */}
            <Accordion title="Hero Section">
                <div className="space-y-4">
                    <Field label="Eyebrow text">
                        <input className={inputCls} value={eyebrow} onChange={e => setEyebrow(e.target.value)} placeholder="Our story" />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Headline line 1">
                            <input className={inputCls} value={headLine1} onChange={e => setHeadLine1(e.target.value)} placeholder="Born in Accra." />
                        </Field>
                        <Field label="Headline line 2">
                            <input className={inputCls} value={headLine2} onChange={e => setHeadLine2(e.target.value)} placeholder="Dressed for Everywhere." />
                        </Field>
                    </div>
                    <Field label="Manifesto paragraph 1">
                        <textarea className={textareaCls} value={p1} onChange={e => setP1(e.target.value)} />
                    </Field>
                    <Field label="Manifesto paragraph 2">
                        <textarea className={textareaCls} value={p2} onChange={e => setP2(e.target.value)} />
                    </Field>
                    <Field label="Manifesto paragraph 3">
                        <textarea className={textareaCls} value={p3} onChange={e => setP3(e.target.value)} />
                    </Field>
                    <SaveButton saving={savingHero} onClick={() => save({
                        about_eyebrow: eyebrow,
                        about_headline_line1: headLine1,
                        about_headline_line2: headLine2,
                        about_manifesto_p1: p1,
                        about_manifesto_p2: p2,
                        about_manifesto_p3: p3,
                    }, setSavingHero)} />
                </div>
            </Accordion>

            {/* STATS */}
            <Accordion title="Stats">
                <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { label: "Stat 1", val: stat1Value, setVal: setStat1Value, lbl: stat1Label, setLbl: setStat1Label },
                            { label: "Stat 2", val: stat2Value, setVal: setStat2Value, lbl: stat2Label, setLbl: setStat2Label },
                            { label: "Stat 3", val: stat3Value, setVal: setStat3Value, lbl: stat3Label, setLbl: setStat3Label },
                        ].map(({ label, val, setVal, lbl, setLbl }) => (
                            <div key={label} className="space-y-2 p-4 bg-neutral-50 rounded-xl">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{label}</p>
                                <Field label="Value">
                                    <input className={inputCls} value={val} onChange={e => setVal(e.target.value)} placeholder="240+" />
                                </Field>
                                <Field label="Label">
                                    <input className={inputCls} value={lbl} onChange={e => setLbl(e.target.value)} placeholder="Styles in store" />
                                </Field>
                            </div>
                        ))}
                    </div>
                    <SaveButton saving={savingStats} onClick={() => save({
                        about_stat_1_value: stat1Value, about_stat_1_label: stat1Label,
                        about_stat_2_value: stat2Value, about_stat_2_label: stat2Label,
                        about_stat_3_value: stat3Value, about_stat_3_label: stat3Label,
                    }, setSavingStats)} />
                </div>
            </Accordion>

            {/* STORY */}
            <Accordion title="Story Section">
                <div className="space-y-4">
                    <Field label="Section heading">
                        <input className={inputCls} value={storyHeading} onChange={e => setStoryHeading(e.target.value)} placeholder="The Miss Tokyo Story" />
                    </Field>
                    <Field label="Story paragraph 1">
                        <textarea className={textareaCls} value={storyP1} onChange={e => setStoryP1(e.target.value)} />
                    </Field>
                    <Field label="Story paragraph 2">
                        <textarea className={textareaCls} value={storyP2} onChange={e => setStoryP2(e.target.value)} />
                    </Field>
                    <div className="pt-2 border-t border-neutral-100">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">Pull Quote</p>
                        <Field label="Quote text">
                            <textarea className={textareaCls} value={quoteText} onChange={e => setQuoteText(e.target.value)} />
                        </Field>
                        <Field label="Quote author">
                            <input className={inputCls} value={quoteAuthor} onChange={e => setQuoteAuthor(e.target.value)} placeholder="Miss Tokyo Team" />
                        </Field>
                    </div>
                    <SaveButton saving={savingStory} onClick={() => save({
                        about_story_heading: storyHeading,
                        about_story_p1: storyP1,
                        about_story_p2: storyP2,
                        about_quote_text: quoteText,
                        about_quote_author: quoteAuthor,
                    }, setSavingStory)} />
                </div>
            </Accordion>

            {/* TIMELINE */}
            <Accordion title="Timeline">
                <div className="space-y-3">
                    {timeline.map((entry, i) => (
                        <div key={i} className="flex gap-3 p-4 bg-neutral-50 rounded-xl">
                            <GripVertical size={14} className="text-neutral-300 mt-2 shrink-0" />
                            <div className="flex-1 space-y-3">
                                <div className="grid grid-cols-3 gap-3">
                                    <Field label="Year">
                                        <input className={inputCls} value={entry.year} onChange={e => updateTimeline(i, "year", e.target.value)} placeholder="2019" />
                                    </Field>
                                    <div className="col-span-2">
                                        <Field label="Title">
                                            <input className={inputCls} value={entry.title} onChange={e => updateTimeline(i, "title", e.target.value)} placeholder="We opened our doors" />
                                        </Field>
                                    </div>
                                </div>
                                <Field label="Body">
                                    <textarea className={`${textareaCls} min-h-[60px]`} value={entry.body} onChange={e => updateTimeline(i, "body", e.target.value)} />
                                </Field>
                            </div>
                            <button type="button" onClick={() => removeTimelineEntry(i)} className="text-neutral-300 hover:text-rose-500 transition-colors mt-2 shrink-0">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={addTimelineEntry}
                        className="flex items-center gap-2 text-[11px] uppercase tracking-widest font-semibold text-neutral-500 hover:text-black transition-colors"
                    >
                        <Plus size={13} /> Add Entry
                    </button>
                    <SaveButton saving={savingTimeline} onClick={() => save({ about_timeline: timeline }, setSavingTimeline)} />
                </div>
            </Accordion>

            {/* VALUES */}
            <Accordion title="Values">
                <div className="space-y-3">
                    {values.map((val, i) => (
                        <div key={i} className="flex gap-3 p-4 bg-neutral-50 rounded-xl">
                            <GripVertical size={14} className="text-neutral-300 mt-2 shrink-0" />
                            <div className="flex-1 space-y-3">
                                <div className="grid grid-cols-3 gap-3">
                                    <Field label="Icon">
                                        <select className={inputCls} value={val.icon} onChange={e => updateValue(i, "icon", e.target.value)}>
                                            {ICON_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </Field>
                                    <div className="col-span-2">
                                        <Field label="Title">
                                            <input className={inputCls} value={val.title} onChange={e => updateValue(i, "title", e.target.value)} placeholder="Quality First" />
                                        </Field>
                                    </div>
                                </div>
                                <Field label="Body">
                                    <textarea className={`${textareaCls} min-h-[60px]`} value={val.body} onChange={e => updateValue(i, "body", e.target.value)} />
                                </Field>
                            </div>
                            <button type="button" onClick={() => removeValue(i)} className="text-neutral-300 hover:text-rose-500 transition-colors mt-2 shrink-0">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={addValue}
                        className="flex items-center gap-2 text-[11px] uppercase tracking-widest font-semibold text-neutral-500 hover:text-black transition-colors"
                    >
                        <Plus size={13} /> Add Value
                    </button>
                    <SaveButton saving={savingValues} onClick={() => save({ about_values: values }, setSavingValues)} />
                </div>
            </Accordion>

            {/* TEAM */}
            <Accordion title="Team">
                <div className="space-y-3">
                    {team.map((member, i) => (
                        <div key={i} className="flex gap-3 p-4 bg-neutral-50 rounded-xl">
                            <GripVertical size={14} className="text-neutral-300 mt-2 shrink-0" />
                            <div className="flex-1 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Name">
                                        <input className={inputCls} value={member.name} onChange={e => updateTeam(i, "name", e.target.value)} placeholder="Jane Doe" />
                                    </Field>
                                    <Field label="Role / Title">
                                        <input className={inputCls} value={member.role} onChange={e => updateTeam(i, "role", e.target.value)} placeholder="Creative Director" />
                                    </Field>
                                </div>
                                <Field label="Bio">
                                    <textarea className={`${textareaCls} min-h-[60px]`} value={member.bio} onChange={e => updateTeam(i, "bio", e.target.value)} />
                                </Field>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Avatar colour">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={member.avatar_color}
                                                onChange={e => updateTeam(i, "avatar_color", e.target.value)}
                                                className="w-10 h-9 rounded border border-neutral-200 cursor-pointer p-0.5"
                                            />
                                            <div className="flex gap-1 flex-wrap">
                                                {AVATAR_COLORS.map(c => (
                                                    <button
                                                        key={c}
                                                        type="button"
                                                        onClick={() => updateTeam(i, "avatar_color", c)}
                                                        className="w-5 h-5 rounded-full border-2 transition-all"
                                                        style={{
                                                            background: c,
                                                            borderColor: member.avatar_color === c ? "black" : "transparent",
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </Field>
                                    <Field label="Photo URL (optional)">
                                        <input className={inputCls} value={member.photo_url ?? ""} onChange={e => updateTeam(i, "photo_url", e.target.value)} placeholder="https://…" />
                                    </Field>
                                </div>
                            </div>
                            <button type="button" onClick={() => removeTeamMember(i)} className="text-neutral-300 hover:text-rose-500 transition-colors mt-2 shrink-0">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={addTeamMember}
                        className="flex items-center gap-2 text-[11px] uppercase tracking-widest font-semibold text-neutral-500 hover:text-black transition-colors"
                    >
                        <Plus size={13} /> Add Team Member
                    </button>
                    <SaveButton saving={savingTeam} onClick={() => save({ about_team: team }, setSavingTeam)} />
                </div>
            </Accordion>

            {/* CTA */}
            <Accordion title="CTA Section">
                <div className="space-y-4">
                    <Field label="Eyebrow">
                        <input className={inputCls} value={ctaEyebrow} onChange={e => setCtaEyebrow(e.target.value)} placeholder="Ready to shop?" />
                    </Field>
                    <Field label="Headline">
                        <input className={inputCls} value={ctaHeadline} onChange={e => setCtaHeadline(e.target.value)} placeholder="Start Your Miss Tokyo Journey" />
                    </Field>
                    <Field label="Body text">
                        <textarea className={textareaCls} value={ctaBody} onChange={e => setCtaBody(e.target.value)} />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Button label">
                            <input className={inputCls} value={ctaBtnLabel} onChange={e => setCtaBtnLabel(e.target.value)} placeholder="Shop Now" />
                        </Field>
                        <Field label="Button URL">
                            <input className={inputCls} value={ctaBtnUrl} onChange={e => setCtaBtnUrl(e.target.value)} placeholder="/shop" />
                        </Field>
                    </div>
                    <SaveButton saving={savingCta} onClick={() => save({
                        about_cta_eyebrow: ctaEyebrow,
                        about_cta_headline: ctaHeadline,
                        about_cta_body: ctaBody,
                        about_cta_btn_label: ctaBtnLabel,
                        about_cta_btn_url: ctaBtnUrl,
                    }, setSavingCta)} />
                </div>
            </Accordion>

        </div>
    );
}
