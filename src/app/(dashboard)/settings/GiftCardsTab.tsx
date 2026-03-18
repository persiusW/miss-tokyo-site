"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { X, Plus } from "lucide-react";

const inputCls = "w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-black transition-colors bg-white";

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
            .then(({ data: s }) => {
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

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500">Gift Card Settings</h2>

                {/* Enable toggle */}
                <div className="flex items-center justify-between py-3 border-b border-neutral-100">
                    <div>
                        <p className="text-sm font-medium text-neutral-900">Enable Gift Cards</p>
                        <p className="text-xs text-neutral-400 mt-0.5">When off, the gift cards page shows a "Coming soon" state.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setEnabled(v => !v)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${enabled ? "bg-black" : "bg-neutral-200"}`}
                    >
                        <span
                            className="absolute top-1 w-4 h-4 bg-white rounded-full transition-all"
                            style={{ left: enabled ? "26px" : "2px" }}
                        />
                    </button>
                </div>

                {/* Min / Max */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-1.5">Minimum Amount (GH₵)</label>
                        <input
                            type="number"
                            min="1"
                            value={minAmount}
                            onChange={e => setMinAmount(Number(e.target.value))}
                            className={inputCls}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-1.5">Maximum Amount (GH₵)</label>
                        <input
                            type="number"
                            min="1"
                            value={maxAmount}
                            onChange={e => setMaxAmount(Number(e.target.value))}
                            className={inputCls}
                        />
                    </div>
                </div>

                {/* Preset amounts */}
                <div>
                    <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Preset Amounts</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {presets.map(val => (
                            <span key={val} className="flex items-center gap-1.5 bg-neutral-100 text-neutral-700 text-xs px-3 py-1.5 rounded-full">
                                GH₵{val}
                                <button type="button" onClick={() => removePreset(val)} className="text-neutral-400 hover:text-rose-500 transition-colors">
                                    <X size={11} />
                                </button>
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            value={newPreset}
                            onChange={e => setNewPreset(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addPreset())}
                            placeholder="Add amount…"
                            className={inputCls}
                        />
                        <button
                            type="button"
                            onClick={addPreset}
                            className="flex items-center gap-1 px-4 py-2 bg-black text-white text-xs uppercase tracking-widest rounded-lg hover:bg-neutral-800 transition-colors whitespace-nowrap"
                        >
                            <Plus size={12} /> Add
                        </button>
                    </div>
                </div>

                {/* Expiry */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between py-3 border-b border-neutral-100">
                        <div>
                            <p className="text-sm font-medium text-neutral-900">Gift Cards Never Expire</p>
                            <p className="text-xs text-neutral-400 mt-0.5">When off, specify validity in days below.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setNeverExpires(v => !v)}
                            className={`w-12 h-6 rounded-full transition-colors relative ${neverExpires ? "bg-black" : "bg-neutral-200"}`}
                        >
                            <span
                                className="absolute top-1 w-4 h-4 bg-white rounded-full transition-all"
                                style={{ left: neverExpires ? "26px" : "2px" }}
                            />
                        </button>
                    </div>
                    {!neverExpires && (
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-1.5">Validity (days)</label>
                            <input
                                type="number"
                                min="1"
                                value={validityDays}
                                onChange={e => setValidityDays(Number(e.target.value))}
                                className={inputCls}
                            />
                        </div>
                    )}
                </div>

                {/* Delivery note */}
                <div>
                    <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-1.5">Delivery Note</label>
                    <p className="text-[10px] text-neutral-400 mb-2 uppercase tracking-wider">Shown in the hero section of the gift cards page.</p>
                    <textarea
                        rows={3}
                        value={deliveryNote}
                        onChange={e => setDeliveryNote(e.target.value)}
                        className={`${inputCls} resize-y min-h-[80px]`}
                    />
                </div>

                {/* Save */}
                <div className="flex justify-end border-t border-neutral-100 pt-4">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2.5 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50 rounded-lg"
                    >
                        {saving ? "Saving…" : "Save Settings"}
                    </button>
                </div>
            </div>
        </div>
    );
}
