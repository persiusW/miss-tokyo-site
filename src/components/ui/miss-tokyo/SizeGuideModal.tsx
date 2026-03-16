"use client";

import { useState } from "react";
import { X } from "lucide-react";
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

export function SizeGuideModal() {
    const [open, setOpen] = useState(false);
    const [rows, setRows] = useState<SizeRow[]>(DEFAULTS);
    const [loaded, setLoaded] = useState(false);

    const handleOpen = async () => {
        setOpen(true);
        if (loaded) return;
        const { data } = await supabase
            .from("site_copy")
            .select("value")
            .eq("copy_key", "size_guide_rows")
            .single();
        if (data?.value) {
            try { setRows(JSON.parse(data.value)); } catch { /* use defaults */ }
        }
        setLoaded(true);
    };

    return (
        <>
            <button
                type="button"
                onClick={handleOpen}
                className="text-[9px] uppercase tracking-[0.2em] text-neutral-400 border-b border-neutral-200 pb-0.5 hover:text-black hover:border-black transition-colors"
            >
                Size Guide
            </button>

            {open && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
                    <div className="relative bg-white max-w-lg w-full p-8 z-10 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="font-serif text-xl uppercase tracking-widest">Size Guide</h2>
                            <button onClick={() => setOpen(false)} className="text-neutral-400 hover:text-black transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <p className="text-xs text-neutral-500 tracking-wide mb-6 leading-relaxed">
                            All measurements are in centimetres. Measure over your undergarments for the best fit.
                        </p>

                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-neutral-200">
                                    {["Size", "Bust (cm)", "Waist (cm)", "Hips (cm)"].map(h => (
                                        <th key={h} className="text-[10px] uppercase tracking-widest font-bold text-black py-3 pr-4">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, i) => (
                                    <tr key={i} className={`border-b border-neutral-100 ${i % 2 === 0 ? "bg-neutral-50" : "bg-white"}`}>
                                        <td className="text-[11px] font-bold uppercase tracking-wide py-3 pr-4">{row.label}</td>
                                        <td className="text-[11px] text-neutral-600 py-3 pr-4">{row.bust}</td>
                                        <td className="text-[11px] text-neutral-600 py-3 pr-4">{row.waist}</td>
                                        <td className="text-[11px] text-neutral-600 py-3">{row.hips}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <p className="text-[10px] text-neutral-400 mt-6 tracking-wide">
                            Between sizes? We recommend sizing up for a relaxed fit or sizing down for a more fitted look.
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}
