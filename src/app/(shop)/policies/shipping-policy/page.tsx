import type { Metadata } from "next";

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
                        Miss Tokyo aims to deliver your order quickly and reliably.
                    </p>
                </section>

                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-neutral-400">
                        Processing & Delivery
                    </h2>
                    <ul className="space-y-3 list-none">
                        <li className="pl-4 border-l border-neutral-200">
                            Orders are processed after payment confirmation.
                        </li>
                        <li className="pl-4 border-l border-neutral-200">
                            Delivery is completed within 2–3 business days after the order is confirmed.
                        </li>
                        <li className="pl-4 border-l border-neutral-200">
                            Delivery times may vary slightly due to location, weekends, or public holidays.
                        </li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-neutral-400">
                        Questions
                    </h2>
                    <p>
                        For shipping enquiries, contact us at{" "}
                        <a
                            href="mailto:orders@misstokyo.shop"
                            className="border-b border-black hover:text-neutral-500 transition-colors"
                        >
                            orders@misstokyo.shop
                        </a>
                        .
                    </p>
                </section>
            </div>
        </div>
    );
}
