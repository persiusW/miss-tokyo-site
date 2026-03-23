import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Size Guide — Miss Tokyo",
    description: "Find your perfect Miss Tokyo fit with our size chart. All measurements are in inches.",
};

const SIZES = [
    { label: "XS — 6", bust: "32–34", waist: "25–26", hip: "35–36" },
    { label: "S — 8", bust: "34–35", waist: "27–28", hip: "37–38" },
    { label: "M — 10", bust: "36–37", waist: "29–30", hip: "39–40" },
    { label: "L — 12", bust: "38–39", waist: "30–32", hip: "41–44" },
    { label: "XL — 14", bust: "40–41", waist: "33–34", hip: "44–45" },
    { label: "XXL — 16", bust: "42–43", waist: "35–36", hip: "46–48" },
];

export default function SizeGuidePage() {
    return (
        <div className="pt-32 pb-24 px-6 md:px-12 max-w-3xl mx-auto min-h-screen">
            <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 mb-4">Fit</p>
            <h1 className="font-serif text-4xl md:text-5xl tracking-widest uppercase mb-4">Size Guide</h1>
            <p className="text-sm text-neutral-500 tracking-[0.1em] mb-16">
                All measurements are in inches. For the best fit, measure over your natural curves.
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
                                key={row.label}
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
            <div className="space-y-8 mb-16">
                <h2 className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 font-semibold">How to Measure</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        {
                            label: "Bust",
                            desc: "Measure around the fullest part of your chest, keeping the tape parallel to the floor.",
                        },
                        {
                            label: "Waist",
                            desc: "Measure around your natural waistline — the narrowest part of your torso.",
                        },
                        {
                            label: "Hip",
                            desc: "Measure around the fullest part of your hips and seat, approximately 8 inches below your waist.",
                        },
                    ].map(item => (
                        <div key={item.label} className="border-l border-neutral-200 pl-4">
                            <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-neutral-900 mb-2">
                                {item.label}
                            </p>
                            <p className="text-sm text-neutral-500 leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Fit Notes */}
            <div className="border border-neutral-200 p-6 mb-16">
                <p className="text-[10px] uppercase tracking-[0.25em] font-semibold text-neutral-400 mb-3">Fit Note</p>
                <p className="text-sm text-neutral-600 leading-relaxed">
                    Miss Tokyo pieces are designed with a tailored, close-to-body silhouette. If you are between
                    sizes, we recommend sizing up.
                </p>
            </div>

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
