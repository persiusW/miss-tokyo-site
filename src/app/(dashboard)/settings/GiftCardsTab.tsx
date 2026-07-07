"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";

export function GiftCardsTab() {
    const [enabled, setEnabled] = useState(true);
    const [minAmount, setMinAmount] = useState(20);
    const [maxAmount, setMaxAmount] = useState(500);
    const [presets, setPresets] = useState<number[]>([50, 100, 150, 200, 250, 300, 400, 500]);
    const [newPreset, setNewPreset] = useState("");
    const [neverExpires, setNeverExpires] = useState(true);
    const [validityDays, setValidityDays] = useState(365);
    const [deliveryNote, setDeliveryNote] = useState("Gift cards are delivered instantly by email and never expire.");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        supabase
            .from("site_settings")
            .select("gc_enabled, gc_min_amount, gc_max_amount, gc_preset_amounts, gc_never_expires, gc_validity_days, gc_delivery_note")
            .eq("id", "singleton")
            .single()
            .then(({ data: s }: { data: any }) => {
                if (!s) return;
                setEnabled(s.gc_enabled ?? true);
                setMinAmount(Number(s.gc_min_amount ?? 20));
                setMaxAmount(Number(s.gc_max_amount ?? 500));
                setPresets((s.gc_preset_amounts as number[]) ?? [50, 100, 150, 200, 250, 300, 400, 500]);
                setNeverExpires(s.gc_never_expires ?? true);
                setValidityDays(Number(s.gc_validity_days ?? 365));
                setDeliveryNote(s.gc_delivery_note ?? "");
            });
    }, []);

    const addPreset = () => {
        const val = parseFloat(newPreset);
        if (!val || val <= 0) return;
        if (!presets.includes(val)) setPresets(p => [...p, val].sort((a, b) => a - b));
        setNewPreset("");
    };

    const removePreset = (val: number) => {
        setPresets(p => p.filter(v => v !== val));
    };

    const handleSave = async () => {
        setSaving(true);
        const { error } = await supabase
            .from("site_settings")
            .update({
                gc_enabled: enabled,
                gc_min_amount: minAmount,
                gc_max_amount: maxAmount,
                gc_preset_amounts: presets,
                gc_never_expires: neverExpires,
                gc_validity_days: validityDays,
                gc_delivery_note: deliveryNote,
            })
            .eq("id", "singleton");
        setSaving(false);
        if (error) { toast.error("Failed to save."); return; }
        toast.success("Gift card settings saved.");
    };

    const toggleStyle = (on: boolean) => ({
        width: 40, height: 22, borderRadius: 11, cursor: "pointer" as const,
        position: "relative" as const, flexShrink: 0,
        background: on ? "var(--ac-ink)" : "var(--ac-line)", transition: "background .2s",
    });
    const knobStyle = (on: boolean) => ({
        display: "inline-block", height: 18, width: 18, borderRadius: "50%",
        background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.2)",
        position: "absolute" as const, top: 2,
        left: on ? 20 : 2, transition: "left .2s",
    });

    return (
        <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="ac-card" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 24 }}>
                <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, color: "var(--ac-ink-3)" }}>Gift Card Settings</p>

                {/* Enable toggle */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingBottom: 16, borderBottom: "1px solid var(--ac-line)" }}>
                    <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--ac-ink)" }}>Enable Gift Cards</p>
                        <p style={{ fontSize: 11, color: "var(--ac-ink-4)", marginTop: 2 }}>When off, the gift cards page shows a "Coming soon" state.</p>
                    </div>
                    <div onClick={() => setEnabled(v => !v)} style={toggleStyle(enabled)}>
                        <span style={knobStyle(enabled)} />
                    </div>
                </div>

                {/* Min / Max */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                        <label className="ac-label">Minimum Amount (GH₵)</label>
                        <input type="number" min="1" value={minAmount}
                            onChange={e => setMinAmount(Number(e.target.value))} className="ac-input" />
                    </div>
                    <div>
                        <label className="ac-label">Maximum Amount (GH₵)</label>
                        <input type="number" min="1" value={maxAmount}
                            onChange={e => setMaxAmount(Number(e.target.value))} className="ac-input" />
                    </div>
                </div>

                {/* Preset amounts */}
                <div>
                    <label className="ac-label">Preset Amounts</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                        {presets.map(val => (
                            <span key={val} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--ac-panel-2)", border: "1px solid var(--ac-line)", borderRadius: "var(--r-xl)", padding: "4px 10px", fontSize: 12, color: "var(--ac-ink-2)" }}>
                                GH₵{val}
                                <button type="button" onClick={() => removePreset(val)}
                                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ac-ink-4)", display: "flex", padding: 0 }}>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                </button>
                            </span>
                        ))}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <input type="number" value={newPreset} onChange={e => setNewPreset(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addPreset())}
                            placeholder="Add amount…" className="ac-input" style={{ flex: 1 }} />
                        <button type="button" onClick={addPreset} className="ac-btn ac-btn-ghost ac-btn-sm" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                            Add
                        </button>
                    </div>
                </div>

                {/* Expiry */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingBottom: 12, borderBottom: "1px solid var(--ac-line)" }}>
                        <div>
                            <p style={{ fontSize: 13, fontWeight: 500, color: "var(--ac-ink)" }}>Gift Cards Never Expire</p>
                            <p style={{ fontSize: 11, color: "var(--ac-ink-4)", marginTop: 2 }}>When off, specify validity in days below.</p>
                        </div>
                        <div onClick={() => setNeverExpires(v => !v)} style={toggleStyle(neverExpires)}>
                            <span style={knobStyle(neverExpires)} />
                        </div>
                    </div>
                    {!neverExpires && (
                        <div>
                            <label className="ac-label">Validity (days)</label>
                            <input type="number" min="1" value={validityDays}
                                onChange={e => setValidityDays(Number(e.target.value))} className="ac-input" />
                        </div>
                    )}
                </div>

                {/* Delivery note */}
                <div>
                    <label className="ac-label">Delivery Note</label>
                    <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ac-ink-4)", marginBottom: 6 }}>Shown in the hero section of the gift cards page.</p>
                    <textarea rows={3} value={deliveryNote} onChange={e => setDeliveryNote(e.target.value)}
                        className="ac-textarea" style={{ minHeight: 80, resize: "vertical" }} />
                </div>

                {/* Save */}
                <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--ac-line)", paddingTop: 16 }}>
                    <button type="button" onClick={handleSave} disabled={saving} className="ac-btn ac-btn-primary">
                        {saving ? "Saving…" : "Save Settings"}
                    </button>
                </div>
            </div>
        </div>
    );
}
