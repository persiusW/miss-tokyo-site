"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import type { AboutTimelineEntry, AboutValue, AboutTeamMember } from "@/types/settings";
import { ImageUploader } from "@/components/ui/miss-tokyo/ImageUploader";

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
    const [open, setOpen] = useState(true);
    return (
        <div className="ac-card" style={{ overflow: "hidden" }}>
            <button type="button" onClick={() => setOpen(o => !o)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: open ? "1px solid var(--ac-line)" : "none", background: "none", border: "none", borderBottom: open ? "1px solid var(--ac-line)" : "none", cursor: "pointer" }}>
                <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-3)" }}>{title}</span>
                {open
                    ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ac-ink-4)" strokeWidth="2" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>
                    : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ac-ink-4)" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                }
            </button>
            {open && <div style={{ padding: 20 }}>{children}</div>}
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="ac-label">{label}</label>
            {children}
        </div>
    );
}

function SaveButton({ saving, onClick }: { saving: boolean; onClick: () => void }) {
    return (
        <div style={{ paddingTop: 16, display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--ac-line)", marginTop: 8 }}>
            <button type="button" onClick={onClick} disabled={saving} className="ac-btn ac-btn-primary">
                {saving ? "Saving…" : "Save"}
            </button>
        </div>
    );
}

export function AboutPageTab() {
    const [eyebrow, setEyebrow] = useState("");
    const [headLine1, setHeadLine1] = useState("");
    const [headLine2, setHeadLine2] = useState("");
    const [p1, setP1] = useState("");
    const [p2, setP2] = useState("");
    const [p3, setP3] = useState("");
    const [stat1Value, setStat1Value] = useState("");
    const [stat1Label, setStat1Label] = useState("");
    const [stat2Value, setStat2Value] = useState("");
    const [stat2Label, setStat2Label] = useState("");
    const [stat3Value, setStat3Value] = useState("");
    const [stat3Label, setStat3Label] = useState("");
    const [storyHeading, setStoryHeading] = useState("");
    const [storyP1, setStoryP1] = useState("");
    const [storyP2, setStoryP2] = useState("");
    const [quoteText, setQuoteText] = useState("");
    const [quoteAuthor, setQuoteAuthor] = useState("");
    const [timeline, setTimeline] = useState<AboutTimelineEntry[]>([]);
    const [values, setValues] = useState<AboutValue[]>([]);
    const [team, setTeam] = useState<AboutTeamMember[]>([]);
    const [ctaEyebrow, setCtaEyebrow] = useState("");
    const [ctaHeadline, setCtaHeadline] = useState("");
    const [ctaBody, setCtaBody] = useState("");
    const [ctaBtnLabel, setCtaBtnLabel] = useState("");
    const [ctaBtnUrl, setCtaBtnUrl] = useState("");
    const [savingHero, setSavingHero] = useState(false);
    const [savingStats, setSavingStats] = useState(false);
    const [savingStory, setSavingStory] = useState(false);
    const [savingTimeline, setSavingTimeline] = useState(false);
    const [savingValues, setSavingValues] = useState(false);
    const [savingTeam, setSavingTeam] = useState(false);
    const [savingCta, setSavingCta] = useState(false);

    useEffect(() => {
        supabase.from("site_settings").select("*").eq("id", "singleton").single()
            .then(({ data: s }: { data: any }) => {
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
        const { error } = await supabase.from("site_settings").update(payload).eq("id", "singleton");
        setSaving(false);
        if (error) { toast.error("Failed to save."); return; }
        toast.success("Saved.");
    }

    function addTimelineEntry() { setTimeline(t => [...t, { year: "", title: "", body: "" }]); }
    function removeTimelineEntry(i: number) { setTimeline(t => t.filter((_, idx) => idx !== i)); }
    function updateTimeline(i: number, field: keyof AboutTimelineEntry, val: string) {
        setTimeline(t => t.map((e, idx) => idx === i ? { ...e, [field]: val } : e));
    }

    const ICON_OPTIONS = ["heart", "shield", "users", "globe", "message", "trending-up", "star", "zap", "award", "check-circle"];
    function addValue() { setValues(v => [...v, { icon: "heart", title: "", body: "" }]); }
    function removeValue(i: number) { setValues(v => v.filter((_, idx) => idx !== i)); }
    function updateValue(i: number, field: keyof AboutValue, val: string) {
        setValues(v => v.map((e, idx) => idx === i ? { ...e, [field]: val } : e));
    }

    const AVATAR_COLORS = ["#1a1a1a", "#b5956a", "#6b7280", "#7c3aed", "#059669", "#dc2626", "#2563eb", "#d97706"];
    function addTeamMember() { setTeam(t => [...t, { name: "", role: "", bio: "", avatar_color: "#1a1a1a", photo_url: "" }]); }
    function removeTeamMember(i: number) { setTeam(t => t.filter((_, idx) => idx !== i)); }
    function updateTeam(i: number, field: keyof AboutTeamMember, val: string) {
        setTeam(t => t.map((e, idx) => idx === i ? { ...e, [field]: val } : e));
    }

    const rowStyle = { display: "flex", gap: 10, padding: "14px 0", borderBottom: "1px solid var(--ac-line)" };
    const gripStyle = { flexShrink: 0, marginTop: 2, color: "var(--ac-line)" };
    const removeBtn = { background: "none", border: "none", cursor: "pointer", color: "var(--ac-ink-4)", flexShrink: 0, marginTop: 2 };

    return (
        <div style={{ maxWidth: 760, display: "flex", flexDirection: "column", gap: 16 }}>

            {/* HERO */}
            <Accordion title="Hero Section">
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <Field label="Eyebrow text">
                        <input className="ac-input" value={eyebrow} onChange={e => setEyebrow(e.target.value)} placeholder="Our story" />
                    </Field>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <Field label="Headline line 1">
                            <input className="ac-input" value={headLine1} onChange={e => setHeadLine1(e.target.value)} placeholder="Born in Accra." />
                        </Field>
                        <Field label="Headline line 2">
                            <input className="ac-input" value={headLine2} onChange={e => setHeadLine2(e.target.value)} placeholder="Dressed for Everywhere." />
                        </Field>
                    </div>
                    <Field label="Manifesto paragraph 1">
                        <textarea className="ac-textarea" value={p1} onChange={e => setP1(e.target.value)} style={{ minHeight: 80 }} />
                    </Field>
                    <Field label="Manifesto paragraph 2">
                        <textarea className="ac-textarea" value={p2} onChange={e => setP2(e.target.value)} style={{ minHeight: 80 }} />
                    </Field>
                    <Field label="Manifesto paragraph 3">
                        <textarea className="ac-textarea" value={p3} onChange={e => setP3(e.target.value)} style={{ minHeight: 80 }} />
                    </Field>
                    <SaveButton saving={savingHero} onClick={() => save({ about_eyebrow: eyebrow, about_headline_line1: headLine1, about_headline_line2: headLine2, about_manifesto_p1: p1, about_manifesto_p2: p2, about_manifesto_p3: p3 }, setSavingHero)} />
                </div>
            </Accordion>

            {/* STATS */}
            <Accordion title="Stats">
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                        {[
                            { label: "Stat 1", val: stat1Value, setVal: setStat1Value, lbl: stat1Label, setLbl: setStat1Label },
                            { label: "Stat 2", val: stat2Value, setVal: setStat2Value, lbl: stat2Label, setLbl: setStat2Label },
                            { label: "Stat 3", val: stat3Value, setVal: setStat3Value, lbl: stat3Label, setLbl: setStat3Label },
                        ].map(({ label, val, setVal, lbl, setLbl }) => (
                            <div key={label} style={{ display: "flex", flexDirection: "column", gap: 12, padding: 14, background: "var(--ac-panel-2)", border: "1px solid var(--ac-line)", borderRadius: "var(--r-md)" }}>
                                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-4)" }}>{label}</p>
                                <Field label="Value">
                                    <input className="ac-input" value={val} onChange={e => setVal(e.target.value)} placeholder="240+" />
                                </Field>
                                <Field label="Label">
                                    <input className="ac-input" value={lbl} onChange={e => setLbl(e.target.value)} placeholder="Styles in store" />
                                </Field>
                            </div>
                        ))}
                    </div>
                    <SaveButton saving={savingStats} onClick={() => save({ about_stat_1_value: stat1Value, about_stat_1_label: stat1Label, about_stat_2_value: stat2Value, about_stat_2_label: stat2Label, about_stat_3_value: stat3Value, about_stat_3_label: stat3Label }, setSavingStats)} />
                </div>
            </Accordion>

            {/* STORY */}
            <Accordion title="Story Section">
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <Field label="Section heading">
                        <input className="ac-input" value={storyHeading} onChange={e => setStoryHeading(e.target.value)} placeholder="The Miss Tokyo Story" />
                    </Field>
                    <Field label="Story paragraph 1">
                        <textarea className="ac-textarea" value={storyP1} onChange={e => setStoryP1(e.target.value)} style={{ minHeight: 80 }} />
                    </Field>
                    <Field label="Story paragraph 2">
                        <textarea className="ac-textarea" value={storyP2} onChange={e => setStoryP2(e.target.value)} style={{ minHeight: 80 }} />
                    </Field>
                    <div style={{ paddingTop: 12, borderTop: "1px solid var(--ac-line)" }}>
                        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-4)", marginBottom: 12 }}>Pull Quote</p>
                        <Field label="Quote text">
                            <textarea className="ac-textarea" value={quoteText} onChange={e => setQuoteText(e.target.value)} style={{ minHeight: 80 }} />
                        </Field>
                        <Field label="Quote author">
                            <input className="ac-input" value={quoteAuthor} onChange={e => setQuoteAuthor(e.target.value)} placeholder="Miss Tokyo Team" />
                        </Field>
                    </div>
                    <SaveButton saving={savingStory} onClick={() => save({ about_story_heading: storyHeading, about_story_p1: storyP1, about_story_p2: storyP2, about_quote_text: quoteText, about_quote_author: quoteAuthor }, setSavingStory)} />
                </div>
            </Accordion>

            {/* TIMELINE */}
            <Accordion title="Timeline">
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {timeline.map((entry, i) => (
                        <div key={i} style={rowStyle}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ ...gripStyle, flexShrink: 0 }}><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
                                    <Field label="Year">
                                        <input className="ac-input" value={entry.year} onChange={e => updateTimeline(i, "year", e.target.value)} placeholder="2019" />
                                    </Field>
                                    <Field label="Title">
                                        <input className="ac-input" value={entry.title} onChange={e => updateTimeline(i, "title", e.target.value)} placeholder="We opened our doors" />
                                    </Field>
                                </div>
                                <Field label="Body">
                                    <textarea className="ac-textarea" value={entry.body} onChange={e => updateTimeline(i, "body", e.target.value)} style={{ minHeight: 60 }} />
                                </Field>
                            </div>
                            <button type="button" onClick={() => removeTimelineEntry(i)} style={removeBtn}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                            </button>
                        </div>
                    ))}
                    <button type="button" onClick={addTimelineEntry}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, color: "var(--ac-ink-3)", background: "none", border: "none", cursor: "pointer", marginTop: 8 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                        Add Entry
                    </button>
                    <SaveButton saving={savingTimeline} onClick={() => save({ about_timeline: timeline }, setSavingTimeline)} />
                </div>
            </Accordion>

            {/* VALUES */}
            <Accordion title="Values">
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {values.map((val, i) => (
                        <div key={i} style={rowStyle}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ ...gripStyle, flexShrink: 0 }}><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
                                    <Field label="Icon">
                                        <select className="ac-select" value={val.icon} onChange={e => updateValue(i, "icon", e.target.value)}>
                                            {ICON_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Title">
                                        <input className="ac-input" value={val.title} onChange={e => updateValue(i, "title", e.target.value)} placeholder="Quality First" />
                                    </Field>
                                </div>
                                <Field label="Body">
                                    <textarea className="ac-textarea" value={val.body} onChange={e => updateValue(i, "body", e.target.value)} style={{ minHeight: 60 }} />
                                </Field>
                            </div>
                            <button type="button" onClick={() => removeValue(i)} style={removeBtn}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                            </button>
                        </div>
                    ))}
                    <button type="button" onClick={addValue}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, color: "var(--ac-ink-3)", background: "none", border: "none", cursor: "pointer", marginTop: 8 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                        Add Value
                    </button>
                    <SaveButton saving={savingValues} onClick={() => save({ about_values: values }, setSavingValues)} />
                </div>
            </Accordion>

            {/* TEAM */}
            <Accordion title="Team">
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {team.map((member, i) => (
                        <div key={i} style={rowStyle}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ ...gripStyle, flexShrink: 0 }}><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                    <Field label="Name">
                                        <input className="ac-input" value={member.name} onChange={e => updateTeam(i, "name", e.target.value)} placeholder="Jane Doe" />
                                    </Field>
                                    <Field label="Role / Title">
                                        <input className="ac-input" value={member.role} onChange={e => updateTeam(i, "role", e.target.value)} placeholder="Creative Director" />
                                    </Field>
                                </div>
                                <Field label="Bio">
                                    <textarea className="ac-textarea" value={member.bio} onChange={e => updateTeam(i, "bio", e.target.value)} style={{ minHeight: 60 }} />
                                </Field>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                    <Field label="Avatar colour">
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <input type="color" value={member.avatar_color}
                                                onChange={e => updateTeam(i, "avatar_color", e.target.value)}
                                                style={{ width: 36, height: 32, borderRadius: "var(--r-sm)", border: "1px solid var(--ac-line)", cursor: "pointer", padding: 2, background: "var(--ac-panel)" }} />
                                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                                {AVATAR_COLORS.map(c => (
                                                    <button key={c} type="button" onClick={() => updateTeam(i, "avatar_color", c)}
                                                        style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${member.avatar_color === c ? "var(--ac-ink)" : "transparent"}`, background: c, cursor: "pointer" }} />
                                                ))}
                                            </div>
                                        </div>
                                    </Field>
                                    <ImageUploader bucket="site-assets" folder="about/team"
                                        currentUrl={member.photo_url || null}
                                        onUpload={url => updateTeam(i, "photo_url", url)}
                                        onRemove={() => updateTeam(i, "photo_url", "")}
                                        aspectRatio="square" label="Photo (optional)" />
                                </div>
                            </div>
                            <button type="button" onClick={() => removeTeamMember(i)} style={removeBtn}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                            </button>
                        </div>
                    ))}
                    <button type="button" onClick={addTeamMember}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, color: "var(--ac-ink-3)", background: "none", border: "none", cursor: "pointer", marginTop: 8 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                        Add Team Member
                    </button>
                    <SaveButton saving={savingTeam} onClick={() => save({ about_team: team }, setSavingTeam)} />
                </div>
            </Accordion>

            {/* CTA */}
            <Accordion title="CTA Section">
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <Field label="Eyebrow">
                        <input className="ac-input" value={ctaEyebrow} onChange={e => setCtaEyebrow(e.target.value)} placeholder="Ready to shop?" />
                    </Field>
                    <Field label="Headline">
                        <input className="ac-input" value={ctaHeadline} onChange={e => setCtaHeadline(e.target.value)} placeholder="Start Your Miss Tokyo Journey" />
                    </Field>
                    <Field label="Body text">
                        <textarea className="ac-textarea" value={ctaBody} onChange={e => setCtaBody(e.target.value)} style={{ minHeight: 80 }} />
                    </Field>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <Field label="Button label">
                            <input className="ac-input" value={ctaBtnLabel} onChange={e => setCtaBtnLabel(e.target.value)} placeholder="Shop Now" />
                        </Field>
                        <Field label="Button URL">
                            <input className="ac-input" value={ctaBtnUrl} onChange={e => setCtaBtnUrl(e.target.value)} placeholder="/shop" />
                        </Field>
                    </div>
                    <SaveButton saving={savingCta} onClick={() => save({ about_cta_eyebrow: ctaEyebrow, about_cta_headline: ctaHeadline, about_cta_body: ctaBody, about_cta_btn_label: ctaBtnLabel, about_cta_btn_url: ctaBtnUrl }, setSavingCta)} />
                </div>
            </Accordion>

        </div>
    );
}
