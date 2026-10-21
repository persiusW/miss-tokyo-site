import type { Metadata } from "next";
import Link from "next/link";
import type { Faq } from "@/content/shopInfo";
import { RichLine } from "@/components/public/PolicyBody";
import { loadFaqs, pageSeo } from "@/lib/content/load";

// Questions are edited in the admin (Content › Pages › FAQ); the original
// list in content/shopInfo.ts is the fallback.
export const revalidate = 300;

export function generateMetadata(): Promise<Metadata> {
    return pageSeo("/faq", {
        title: "FAQ — Miss Tokyo",
        description: "Answers to common questions about orders, returns, shipping, sizing, and more.",
    });
}

export default async function FAQPage() {
    // Group by section, in the order the sections first appear.
    const sections = (await loadFaqs()).reduce<Record<string, Faq[]>>((acc, faq) => {
        if (!acc[faq.section]) acc[faq.section] = [];
        acc[faq.section].push(faq);
        return acc;
    }, {});
    return (
        <div className="pt-32 pb-24 px-6 md:px-12 max-w-3xl mx-auto min-h-screen">
            <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 mb-4">Help</p>
            <h1 className="font-serif text-4xl md:text-5xl tracking-widest uppercase mb-6">FAQ</h1>
            <p className="text-sm tracking-[0.1em] text-neutral-500 mb-16">Frequently asked questions.</p>

            <div className="space-y-16">
                {Object.entries(sections).map(([section, faqs]) => (
                    <div key={section}>
                        <h2 className="text-[10px] uppercase tracking-[0.3em] font-semibold text-neutral-400 mb-8 border-b border-neutral-100 pb-4">
                            {section}
                        </h2>
                        <div className="space-y-8">
                            {faqs.map((faq, i) => (
                                <div key={i} className="border-b border-neutral-100 pb-8">
                                    <h3 className="text-sm font-semibold uppercase tracking-[0.12em] mb-3 text-neutral-900">
                                        {faq.question}
                                    </h3>
                                    <p className="text-sm text-neutral-600 leading-relaxed">
                                        <RichLine text={faq.answer} />
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-20 border-t border-neutral-100 pt-12">
                <p className="text-sm tracking-widest uppercase text-neutral-500 mb-4">Still have questions?</p>
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
