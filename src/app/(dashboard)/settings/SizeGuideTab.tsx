"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface SizeRow {
    label: string;
    bust: string;
    waist: string;
    hips: string;
}

const DEFAULTS: SizeRow[] = [
    { label: "XS",  bust: "80–83",   waist: "62–65",  hips: "88–91"   },
    { label: "S",   bust: "84–87",   waist: "66–69",  hips: "92–95"   },
    { label: "M",   bust: "88–91",   waist: "70–73",  hips: "96–99"   },
    { label: "L",   bust: "92–96",   waist: "74–78",  hips: "100–104" },
    { label: "XL",  bust: "97–102",  waist: "79–84",  hips: "105–110" },
    { label: "XXL", bust: "103–110", waist: "85–92",  hips: "111–118" },
];

const FIELDS: { key: keyof SizeRow; label: string }[] = [
    { key: "label", label: "Size" },
    { key: "bust",  label: "Bust (cm)" },
    { key: "waist", label: "Waist (cm)" },
    { key: "hips",  label: "Hips (cm)" },
];

export function SizeGuideTab() {
    const [rows, setRows] = useState<SizeRow[]>(DEFAULTS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        supabase.from("site_copy")
            .select("value")
            .eq("copy_key", "size_guide_rows")
            .single()
            .then(({ data }) => {
                if (data?.value) {
                    try { setRows(JSON.parse(data.value)); } catch { /* use defaults */ }
                }
                setLoading(false);
            });
    }, []);

    const handleChange = (index: number, field: keyof SizeRow, value: string) => {
        setRows(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
    };

    const handleAddRow = () => {
        setRows(prev => [...prev, { label: "", bust: "", waist: "", hips: "" }]);
    };

    const handleRemoveRow = (index: number) => {
        setRows(prev => prev.filter((_, i) => i !== index));
    };

    const handleReset = () => setRows(DEFAULTS);

    const handleSave = async () => {
        setSaving(true);
        await supabase.from("site_copy").upsert(
            {
                copy_key: "size_guide_rows",
                label: "Size Guide Table",
                page_group: "size_guide",
                value: JSON.stringify(rows),
                updated_at: new Date().toISOString(),
            },
            { onConflict: "copy_key" }
        );
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    if (loading) return <p className="text-neutral-400 italic font-serif py-8">Loading size guide...</p>;

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-sm font-semibold uppercase tracking-widest mb-2">Size Guide Editor</h2>
                <p className="text-neutral-500 text-sm leading-relaxed">
                    Edit the size guide shown on all product pages. Measurements are in centimetres.
                    Changes are reflected immediately on the storefront.
                </p>
            </div>

            <div className="overflow-x-auto border border-neutral-200">
                <table className="w-full border-collapse min-w-[500px]">
                    <thead>
                        <tr className="bg-neutral-50 border-b border-neutral-200">
                            {FIELDS.map(f => (
                                <th key={f.key} className="text-[10px] uppercase tracking-widest text-left py-3 px-4 font-semibold text-neutral-500">
                                    {f.label}
                                </th>
                            ))}
                            <th className="py-3 px-4 w-10" />
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr key={i} className="border-b border-neutral-100 last:border-0">
                                {FIELDS.map(f => (
                                    <td key={f.key} className="px-4 py-2">
                                        <input
                                            type="text"
                                            value={row[f.key]}
                                            onChange={e => handleChange(i, f.key, e.target.value)}
                                            placeholder={f.label}
                                            className="w-full border-b border-neutral-200 bg-transparent py-1.5 text-sm outline-none focus:border-black transition-colors"
                                        />
                                    </td>
                                ))}
                                <td className="px-4 py-2 text-center">
                                    <button
                                        onClick={() => handleRemoveRow(i)}
                                        className="text-neutral-300 hover:text-red-500 transition-colors text-sm leading-none"
                                        title="Remove row"
                                    >
                                        ✕
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
                <button
                    onClick={handleAddRow}
                    className="text-[10px] uppercase tracking-widest font-bold border border-neutral-200 px-5 py-2.5 hover:border-black transition-colors"
                >
                    + Add Row
                </button>
                <button
                    onClick={handleReset}
                    className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 hover:text-black transition-colors underline underline-offset-4"
                >
                    Reset to Defaults
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-8 py-2.5 bg-black text-white text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50 ml-auto"
                >
                    {saving ? "Saving..." : saved ? "Saved ✓" : "Save Size Guide"}
                </button>
            </div>

            <p className="text-[10px] text-neutral-400 tracking-wider">
                Tip: You can add custom rows for regional sizes (e.g., EU 36, UK 8) or remove irrelevant sizes.
            </p>
        </div>
    );
}
