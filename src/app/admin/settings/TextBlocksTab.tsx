"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";

type CopyRow = {
    copy_key: string;
    label: string;
    page_group: string;
    value: string;
    updated_at: string;
};

export function TextBlocksTab() {
    const [rows, setRows] = useState<CopyRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    const fetchCopy = async () => {
        setLoading(true);
        const { data } = await supabase.from("site_copy").select("*").order("page_group").order("copy_key");
        if (data) setRows(data);
        setLoading(false);
    };

    useEffect(() => { fetchCopy(); }, []);

    const handleSave = async (key: string, value: string) => {
        setSaving(key);
        const { error } = await supabase.from("site_copy")
            .update({ value, updated_at: new Date().toISOString() })
            .eq("copy_key", key);
        
        if (error) toast.error("Failed to commit text block.");
        else {
            toast.success("Text block synchronized.");
            fetchCopy();
        }
        setSaving(null);
    };

    if (loading) return <div className="py-20 text-center text-[10px] uppercase tracking-widest text-gray-300 italic font-serif">Parsing transcripts...</div>;

    const groups = Array.from(new Set(rows.map(r => r.page_group)));

    return (
        <div className="space-y-12">
            {groups.map(group => {
                const groupRows = rows.filter(r => r.page_group === group);
                return (
                    <div key={group}>
                        <h2 className="text-[11px] uppercase tracking-widest font-bold text-gray-400 mb-6 pb-2 border-b border-gray-100">
                             {group} Edition
                        </h2>
                        <div className="space-y-6">
                            {groupRows.map(row => (
                                <div key={row.copy_key} className="bg-white border border-gray-100 p-8 hover:border-black transition-colors group">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-widest font-bold text-black">{row.label}</p>
                                            <span className="text-[9px] text-gray-300 font-mono italic">{row.copy_key}</span>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                const input = document.getElementById(`copy-${row.copy_key}`) as HTMLTextAreaElement;
                                                handleSave(row.copy_key, input.value);
                                            }}
                                            disabled={saving === row.copy_key}
                                            className="text-[10px] uppercase tracking-widest font-bold text-gray-300 hover:text-black transition-colors"
                                        >
                                            {saving === row.copy_key ? "Persisting..." : "Commit"}
                                        </button>
                                    </div>
                                    <textarea
                                        id={`copy-${row.copy_key}`}
                                        defaultValue={row.value}
                                        rows={3}
                                        className="w-full border-b border-gray-50 bg-transparent py-2 text-xs outline-none focus:border-black transition-colors resize-none font-medium leading-relaxed"
                                    />
                                    <div className="mt-4 flex justify-end">
                                        <span className="text-[9px] text-gray-200 uppercase tracking-widest">
                                            {row.updated_at ? `Captured: ${new Date(row.updated_at).toLocaleDateString()}` : ""}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
