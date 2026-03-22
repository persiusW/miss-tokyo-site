import type { Metadata } from "next";

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
                        At Miss Tokyo, customer satisfaction is important to us. If you are not fully satisfied
                        with your purchase, you may request a return within 72 hours of receiving your order.
                    </p>
                </section>

                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-neutral-400">
                        Eligibility
                    </h2>
                    <ul className="space-y-3 list-none">
                        <li className="pl-4 border-l border-neutral-200">
                            Items must be unused, unworn, and in original condition with tags attached.
                        </li>
                        <li className="pl-4 border-l border-neutral-200">
                            Returns must be requested within the 72-hour return window after delivery.
                        </li>
                        <li className="pl-4 border-l border-neutral-200">
                            Items damaged due to misuse or normal wear are not eligible for return.
                        </li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-neutral-400">
                        Once Your Return Is Approved
                    </h2>
                    <ul className="space-y-3 list-none">
                        <li className="pl-4 border-l border-neutral-200">Offer an exchange, or</li>
                        <li className="pl-4 border-l border-neutral-200">
                            Provide store credit equal to the purchase value.
                        </li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-neutral-400">
                        Please Note
                    </h2>
                    <p>
                        Delivery fees are non-refundable, and customers may be responsible for return shipping
                        costs unless the item received was incorrect or defective.
                    </p>
                </section>

                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-neutral-400">
                        Contact
                    </h2>
                    <p>
                        To initiate a return, contact us at{" "}
                        <a
                            href="mailto:orders@misstokyo.shop"
                            className="border-b border-black hover:text-neutral-500 transition-colors"
                        >
                            orders@misstokyo.shop
                        </a>
                        {" "}within 72 hours of delivery.
                    </p>
                </section>
            </div>
        </div>
    );
}
