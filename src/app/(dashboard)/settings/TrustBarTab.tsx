"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";

type TrustBarItem = {
    id: string;
    text: string;
    enabled: boolean;
};

export function TrustBarTab() {
    const [enabled, setEnabled] = useState(false);
    const [items, setItems] = useState<TrustBarItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        supabase
            .from("site_settings")
            .select("trust_bar_enabled, trust_bar_items")
            .eq("id", "singleton")
            .single()
            .then(({ data }: { data: any }) => {
                if (data) {
                    setEnabled(data.trust_bar_enabled ?? false);
                    setItems(Array.isArray(data.trust_bar_items) ? data.trust_bar_items : []);
                }
                setLoading(false);
            });
    }, []);

    const addItem = () => {
        setItems(prev => [...prev, { id: crypto.randomUUID(), text: "", enabled: true }]);
    };

    const updateItem = (id: string, field: keyof TrustBarItem, value: string | boolean) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const removeItem = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
    };

    const moveItem = (index: number, direction: "up" | "down") => {
        const next = [...items];
        const swapIndex = direction === "up" ? index - 1 : index + 1;
        if (swapIndex < 0 || swapIndex >= next.length) return;
        [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
        setItems(next);
    };

    const handleSave = async () => {
        setSaving(true);
        const { error } = await supabase
            .from("site_settings")
            .upsert({ id: "singleton", trust_bar_enabled: enabled, trust_bar_items: items }, { onConflict: "id" });
        setSaving(false);
        if (error) { toast.error("Failed to save trust bar"); }
        else { toast.success("Trust bar saved"); }
    };

    const toggleStyle = (on: boolean) => ({
        width: 36, height: 20, borderRadius: 10, cursor: "pointer" as const,
        position: "relative" as const, flexShrink: 0,
        background: on ? "var(--ac-ink)" : "var(--ac-line)", transition: "background .2s",
    });
    const knobStyle = (on: boolean) => ({
        display: "inline-block", height: 16, width: 16, borderRadius: "50%",
        background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.2)",
        position: "absolute" as const, top: 2,
        left: on ? 18 : 2, transition: "left .2s",
    });

    if (loading) return <div className="ac-empty"><p className="ac-empty-title">Loading…</p></div>;

    return (
        <div style={{ maxWidth: 580, display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
                <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, color: "var(--ac-ink-4)", marginBottom: 4 }}>Trust Bar</p>
                <p style={{ fontSize: 13, color: "var(--ac-ink-3)" }}>The thin message strip displayed below the navigation.</p>
            </div>

            {/* Master toggle */}
            <div className="ac-card" style={{ padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--ac-ink)" }}>Show trust bar</p>
                        <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-4)", marginTop: 2 }}>Displays the strip across all pages</p>
                    </div>
                    <div onClick={() => setEnabled(v => !v)} style={toggleStyle(enabled)}>
                        <span style={knobStyle(enabled)} />
                    </div>
                </div>
            </div>

            {/* Items */}
            <div className="ac-card" style={{ padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--ac-line)", paddingBottom: 12, marginBottom: 12 }}>
                    <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, color: "var(--ac-ink-3)" }}>Items</p>
                    <button type="button" onClick={addItem} className="ac-text-link" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em" }}>
                        + Add Item
                    </button>
                </div>

                {items.length === 0 && (
                    <p style={{ fontSize: 12, color: "var(--ac-ink-4)", fontStyle: "italic" }}>No items yet. Add one above.</p>
                )}

                {items.map((item, index) => (
                    <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 10, borderBottom: index < items.length - 1 ? "1px solid var(--ac-line)" : "none", marginBottom: index < items.length - 1 ? 10 : 0 }}>
                        <span style={{ fontSize: 10, color: "var(--ac-ink-4)", width: 20, flexShrink: 0, textAlign: "center" }}>{index + 1}</span>

                        <input
                            type="text"
                            value={item.text}
                            onChange={e => updateItem(item.id, "text", e.target.value)}
                            className="ac-input"
                            style={{ flex: 1 }}
                            placeholder="Free delivery on orders over GH₵200"
                        />

                        <div onClick={() => updateItem(item.id, "enabled", !item.enabled)} style={toggleStyle(item.enabled)}>
                            <span style={knobStyle(item.enabled)} />
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
                            <button type="button" onClick={() => moveItem(index, "up")} disabled={index === 0}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ac-ink-4)", padding: 2, opacity: index === 0 ? 0.3 : 1 }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>
                            </button>
                            <button type="button" onClick={() => moveItem(index, "down")} disabled={index === items.length - 1}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ac-ink-4)", padding: 2, opacity: index === items.length - 1 ? 0.3 : 1 }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                            </button>
                        </div>

                        <button type="button" onClick={() => removeItem(item.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ac-ink-4)", flexShrink: 0 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                    </div>
                ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={handleSave} disabled={saving} className="ac-btn ac-btn-primary">
                    {saving ? "Saving…" : "Save Trust Bar"}
                </button>
            </div>
        </div>
    );
}
