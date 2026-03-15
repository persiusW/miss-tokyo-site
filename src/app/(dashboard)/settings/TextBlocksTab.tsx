"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type CopyRow = {
    copy_key: string;
    label: string;
    page_group: string;
    value: string;
    hint: string | null;
    updated_at: string;
};

const PAGE_GROUP_LABELS: Record<string, string> = {
    homepage: "Homepage",
    about:    "About Page",
    craft:    "Craft Page",
};

export function TextBlocksTab() {
    const [rows, setRows] = useState<CopyRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [edits, setEdits] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState<string | null>(null);
    const [saved, setSaved] = useState<string | null>(null);

    const fetchCopy = async () => {
        setLoading(true);
        const { data } = await supabase.from("site_copy").select("*").order("page_group").order("copy_key");
        if (data) setRows(data);
        setLoading(false);
    };

    useEffect(() => { fetchCopy(); }, []);

    const getValue = (row: CopyRow) =>
        edits[row.copy_key] !== undefined ? edits[row.copy_key] : row.value;

    const handleChange = (key: string, val: string) =>
        setEdits(prev => ({ ...prev, [key]: val }));

    const handleSave = async (key: string) => {
        const value = edits[key];
        if (value === undefined) return;
        setSaving(key);
        await supabase.from("site_copy")
            .update({ value, updated_at: new Date().toISOString() })
            .eq("copy_key", key);
        setEdits(prev => { const n = { ...prev }; delete n[key]; return n; });
        await fetchCopy();
        setSaving(null);
        setSaved(key);
        setTimeout(() => setSaved(null), 2000);
    };

    if (loading) {
        return <p className="text-neutral-400 italic font-serif">Loading text blocks...</p>;
    }

    const groups = Array.from(new Set(rows.map(r => r.page_group)));

    return (
        <div className="space-y-10">
            <p className="text-neutral-500 text-sm">
                Edit static text displayed across the storefront. Changes are live within 60 seconds due to page caching.
            </p>

            {groups.map(group => {
                const groupRows = rows.filter(r => r.page_group === group);
                return (
                    <div key={group}>
                        <h2 className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 mb-4 pb-3 border-b border-neutral-100">
                            {PAGE_GROUP_LABELS[group] ?? group}
                        </h2>
                        <div className="space-y-4">
                            {groupRows.map(row => {
                                const current = getValue(row);
                                const isDirty = edits[row.copy_key] !== undefined;
                                const isSaving = saving === row.copy_key;
                                const isSaved = saved === row.copy_key;
                                const isLong = row.value.length > 80;

                                return (
                                    <div key={row.copy_key} className="bg-white border border-neutral-200 p-6">
                                        <div className="flex items-start justify-between gap-4 mb-3">
                                            <div>
                                                <p className="text-xs font-semibold tracking-wide text-neutral-800">{row.label}</p>
                                                {row.hint && (
                                                    <p className="text-[10px] text-neutral-400 tracking-wider mt-0.5">{row.hint}</p>
                                                )}
                                            </div>
                                            <span className="font-mono text-[10px] text-neutral-300 shrink-0">{row.copy_key}</span>
                                        </div>

                                        {isLong ? (
                                            <textarea
                                                rows={3}
                                                value={current}
                                                onChange={e => handleChange(row.copy_key, e.target.value)}
                                                className="w-full border border-neutral-200 bg-neutral-50 p-3 text-sm outline-none focus:border-black transition-colors resize-y font-serif leading-relaxed"
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                value={current}
                                                onChange={e => handleChange(row.copy_key, e.target.value)}
                                                className="w-full border-b border-neutral-300 bg-transparent py-2 text-sm outline-none focus:border-black transition-colors"
                                            />
                                        )}

                                        <div className="flex items-center justify-between mt-3">
                                            <span className="text-[10px] text-neutral-300 tracking-wider">
                                                {row.updated_at
                                                    ? `Updated ${new Date(row.updated_at).toLocaleDateString()}`
                                                    : ""}
                                            </span>
                                            <button
                                                onClick={() => handleSave(row.copy_key)}
                                                disabled={isSaving || !isDirty}
                                                className="px-5 py-2 bg-black text-white text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                                {isSaving ? "Saving..." : isSaved ? "Saved ✓" : "Save"}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
