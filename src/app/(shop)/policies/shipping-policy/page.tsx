import type { Metadata } from "next";
import { SHIPPING_POLICY as S } from "@/content/shopInfo";

export const metadata: Metadata = {
    title: "Shipping Policy — Miss Tokyo",
};

export default function ShippingPolicyPage() {
    return (
        <div className="pt-32 pb-24 px-6 md:px-12 max-w-3xl mx-auto min-h-screen">
            <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 mb-4">Policies</p>
            <h1 className="font-serif text-4xl md:text-5xl tracking-widest uppercase mb-16">Shipping Policy</h1>

            <div className="space-y-12 text-sm text-neutral-700 leading-relaxed">
                <section>
                    <p>
                        {S.intro}
                    </p>
                </section>

                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-neutral-400">
                        Processing & Delivery
                    </h2>
                    <ul className="space-y-3 list-none">
                        {S.processing.map(t => <li key={t} className="pl-4 border-l border-neutral-200">{t}</li>)}
                    </ul>
                </section>

                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-neutral-400">
                        Questions
                    </h2>
                    <p>
                        For shipping enquiries, contact us at{" "}
                        <a
                            href={`mailto:${S.contactEmail}`}
                            className="border-b border-black hover:text-neutral-500 transition-colors"
                        >
                            {S.contactEmail}
                        </a>
                        .
                    </p>
                </section>
            </div>
        </div>
    );
}
