import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Privacy Policy — Miss Tokyo",
};

export default function PrivacyPolicyPage() {
    return (
        <div className="pt-32 pb-24 px-6 md:px-12 max-w-3xl mx-auto min-h-screen">
            <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 mb-4">Policies</p>
            <h1 className="font-serif text-4xl md:text-5xl tracking-widest uppercase mb-16">Privacy Policy</h1>

            <div className="space-y-12 text-sm text-neutral-700 leading-relaxed">
                <section>
                    <p>
                        Miss Tokyo respects your privacy and is committed to protecting your personal
                        information.
                    </p>
                </section>

                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-neutral-400">
                        Information We Collect
                    </h2>
                    <ul className="space-y-3 list-none">
                        {[
                            "Name, phone number, and email address",
                            "Delivery address",
                            "Payment and order information",
                            "Website usage data for improving customer experience",
                        ].map((item) => (
                            <li key={item} className="pl-4 border-l border-neutral-200">{item}</li>
                        ))}
                    </ul>
                </section>

                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-neutral-400">
                        How We Use Your Information
                    </h2>
                    <ul className="space-y-3 list-none">
                        <li className="pl-4 border-l border-neutral-200">Process and deliver orders</li>
                        <li className="pl-4 border-l border-neutral-200">
                            Communicate order updates and customer support
                        </li>
                        <li className="pl-4 border-l border-neutral-200">
                            Improve our services and website experience
                        </li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-neutral-400">
                        Data Sharing
                    </h2>
                    <p>
                        We do not sell or share your personal data with third parties except when required for
                        payment processing, delivery services, or legal obligations.
                    </p>
                </section>

                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-neutral-400">
                        Contact
                    </h2>
                    <p>
                        For any privacy concerns, contact us at{" "}
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
