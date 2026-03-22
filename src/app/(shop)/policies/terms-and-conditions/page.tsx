import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Terms & Conditions — Miss Tokyo",
};

export default function TermsAndConditionsPage() {
    return (
        <div className="pt-32 pb-24 px-6 md:px-12 max-w-3xl mx-auto min-h-screen">
            <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 mb-4">Policies</p>
            <h1 className="font-serif text-4xl md:text-5xl tracking-widest uppercase mb-16">Terms &amp; Conditions</h1>

            <div className="space-y-12 text-sm text-neutral-700 leading-relaxed">
                <section>
                    <p>
                        By using the Miss Tokyo website or purchasing from us, you agree to the following terms.
                    </p>
                </section>

                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-neutral-400">
                        Orders &amp; Payments
                    </h2>
                    <ul className="space-y-3 list-none">
                        <li className="pl-4 border-l border-neutral-200">
                            All orders must be fully paid before processing and delivery.
                        </li>
                        <li className="pl-4 border-l border-neutral-200">
                            Prices and product availability may change without prior notice.
                        </li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-neutral-400">
                        Products
                    </h2>
                    <p>
                        We aim to display products accurately, but slight colour or design differences may occur
                        due to lighting or screen settings.
                    </p>
                </section>

                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-neutral-400">
                        Returns &amp; Exchanges
                    </h2>
                    <p>
                        Returns are only accepted within 72 hours after delivery and must meet our return
                        conditions. See our{" "}
                        <a
                            href="/policies/refund-policy"
                            className="border-b border-black hover:text-neutral-500 transition-colors"
                        >
                            Refund Policy
                        </a>{" "}
                        for full details.
                    </p>
                </section>

                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-neutral-400">
                        Limitation of Liability
                    </h2>
                    <p>
                        Miss Tokyo is not responsible for delays caused by courier services or external factors,
                        or for any issues arising from the improper use of purchased products.
                    </p>
                </section>

                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-neutral-400">
                        Updates to Policies
                    </h2>
                    <p>
                        We may update these policies at any time. Changes will be posted on this page.
                    </p>
                </section>
            </div>
        </div>
    );
}
