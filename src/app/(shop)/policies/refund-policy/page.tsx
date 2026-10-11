import type { Metadata } from "next";
import { REFUND_POLICY as R } from "@/content/shopInfo";

export const metadata: Metadata = {
    title: "Refund Policy — Miss Tokyo",
};

export default function RefundPolicyPage() {
    return (
        <div className="pt-32 pb-24 px-6 md:px-12 max-w-3xl mx-auto min-h-screen">
            <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 mb-4">Policies</p>
            <h1 className="font-serif text-4xl md:text-5xl tracking-widest uppercase mb-16">Refund Policy</h1>

            <div className="space-y-12 text-sm text-neutral-700 leading-relaxed">
                <section>
                    <p>
                        {R.intro}
                    </p>
                </section>

                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-neutral-400">
                        Eligibility
                    </h2>
                    <ul className="space-y-3 list-none">
                        {R.eligibility.map(t => <li key={t} className="pl-4 border-l border-neutral-200">{t}</li>)}
                    </ul>
                </section>

                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-neutral-400">
                        Once Your Return Is Approved
                    </h2>
                    <ul className="space-y-3 list-none">
                        {R.approved.map(t => <li key={t} className="pl-4 border-l border-neutral-200">{t}</li>)}
                    </ul>
                </section>

                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-neutral-400">
                        Please Note
                    </h2>
                    <p>
                        {R.note}
                    </p>
                </section>

                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-neutral-400">
                        Contact
                    </h2>
                    <p>
                        To initiate a return, contact us at{" "}
                        <a
                            href={`mailto:${R.contactEmail}`}
                            className="border-b border-black hover:text-neutral-500 transition-colors"
                        >
                            {R.contactEmail}
                        </a>
                        {" "}within 72 hours of delivery.
                    </p>
                </section>
            </div>
        </div>
    );
}
