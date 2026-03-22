import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Accessibility Statement — Miss Tokyo",
};

export default function AccessibilityStatementPage() {
    return (
        <div className="pt-32 pb-24 px-6 md:px-12 max-w-3xl mx-auto min-h-screen">
            <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 mb-4">Policies</p>
            <h1 className="font-serif text-4xl md:text-5xl tracking-widest uppercase mb-16">
                Accessibility Statement
            </h1>

            <div className="space-y-12 text-sm text-neutral-700 leading-relaxed">
                <section>
                    <p>
                        We at Miss Tokyo are working to make our site accessible to people with disabilities.
                        An accessible site allows visitors with disabilities to browse the site with the same
                        or a similar level of ease and enjoyment as other visitors.
                    </p>
                </section>

                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-neutral-400">
                        Accessibility Adjustments
                    </h2>
                    <p className="mb-4">
                        This site&apos;s contents have been adapted to work with assistive technologies, such as
                        screen readers and keyboard use. As part of this effort, we have:
                    </p>
                    <ul className="space-y-3 list-none">
                        {[
                            "Set the language of the site",
                            "Set the content order of the site's pages",
                            "Defined clear heading structures on all of the site's pages",
                            "Added alternative text to images",
                            "Implemented colour combinations that meet the required colour contrast",
                        ].map((item) => (
                            <li key={item} className="pl-4 border-l border-neutral-200">{item}</li>
                        ))}
                    </ul>
                </section>

                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-neutral-400">
                        Requests, Issues &amp; Suggestions
                    </h2>
                    <p className="mb-6">
                        If you find an accessibility issue on the site, or if you require further assistance,
                        you are welcome to contact us:
                    </p>
                    <ul className="space-y-3 list-none">
                        <li className="pl-4 border-l border-neutral-200">
                            Email:{" "}
                            <a
                                href="mailto:orders@misstokyo.shop"
                                className="border-b border-black hover:text-neutral-500 transition-colors"
                            >
                                orders@misstokyo.shop
                            </a>
                        </li>
                        <li className="pl-4 border-l border-neutral-200">Phone: 055 389 8704</li>
                        <li className="pl-4 border-l border-neutral-200">
                            Address: Dome Road, Accra, Ghana
                        </li>
                    </ul>
                </section>
            </div>
        </div>
    );
}
