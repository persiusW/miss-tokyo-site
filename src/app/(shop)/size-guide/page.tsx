import type { Metadata } from "next";
import Link from "next/link";
import { loadSizeGuidePage, pageSeo } from "@/lib/content/load";

// The chart and notes are edited in the admin (Content › Pages › Size guide);
// the original in content/shopInfo.ts is the fallback.
export const revalidate = 300;

export function generateMetadata(): Promise<Metadata> {
    return pageSeo("/size-guide", {
        title: "Size Guide — Miss Tokyo",
        description: "Find your perfect Miss Tokyo fit with our size chart. All measurements are in inches.",
    });
}

export default async function SizeGuidePage() {
    const { note, rows: SIZES, measure: HOW_TO_MEASURE, fitNote: FIT_NOTE } = await loadSizeGuidePage();
    return (
        <div className="pt-32 pb-24 px-6 md:px-12 max-w-3xl mx-auto min-h-screen">
            <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 mb-4">Fit</p>
            <h1 className="font-serif text-4xl md:text-5xl tracking-widest uppercase mb-4">Size Guide</h1>
            <p className="text-sm text-neutral-500 tracking-[0.1em] mb-16">
                {note}
            </p>

            {/* Size Chart Table */}
            <div className="overflow-x-auto mb-16">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="border-b border-neutral-200">
                            {["Size", "Bust", "Waist", "Hip"].map(col => (
                                <th
                                    key={col}
                                    className="text-left text-[10px] uppercase tracking-[0.25em] text-neutral-400 font-semibold pb-4 pr-8 last:pr-0"
                                >
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {SIZES.map((row, i) => (
                            <tr
                                key={`${row.label}-${i}`}
                                className={`border-b border-neutral-100 ${i % 2 === 0 ? "" : "bg-neutral-50"}`}
                            >
                                <td className="py-4 pr-8 font-semibold text-neutral-900 tracking-wide whitespace-nowrap">
                                    {row.label}
                                </td>
                                <td className="py-4 pr-8 text-neutral-600 tabular-nums">{row.bust}</td>
                                <td className="py-4 pr-8 text-neutral-600 tabular-nums">{row.waist}</td>
                                <td className="py-4 text-neutral-600 tabular-nums">{row.hip}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* How to Measure */}
            {HOW_TO_MEASURE.length > 0 && <div className="space-y-8 mb-16">
                <h2 className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 font-semibold">How to Measure</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {HOW_TO_MEASURE.map((item, i) => (
                        <div key={`${item.label}-${i}`} className="border-l border-neutral-200 pl-4">
                            <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-neutral-900 mb-2">
                                {item.label}
                            </p>
                            <p className="text-sm text-neutral-500 leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </div>}

            {/* Fit Notes */}
            {FIT_NOTE && <div className="border border-neutral-200 p-6 mb-16">
                <p className="text-[10px] uppercase tracking-[0.25em] font-semibold text-neutral-400 mb-3">Fit Note</p>
                <p className="text-sm text-neutral-600 leading-relaxed">
                    {FIT_NOTE}
                </p>
            </div>}

            {/* Help */}
            <div className="text-center md:text-left">
                <p className="text-sm tracking-widest uppercase text-neutral-500 mb-4">Not sure of your size?</p>
                <Link
                    href="/contact"
                    className="text-xs uppercase tracking-widest font-semibold border-b border-black pb-1 hover:text-neutral-500 transition-colors"
                >
                    Contact Us →
                </Link>
            </div>
        </div>
    );
}
