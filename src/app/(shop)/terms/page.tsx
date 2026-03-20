export default function TermsPage() {
    return (
        <div className="pt-32 pb-24 px-6 md:px-12 max-w-3xl mx-auto min-h-screen">
            <h1 className="font-serif text-4xl md:text-5xl tracking-widest uppercase mb-16">Terms of Service</h1>

            <div className="space-y-12 text-sm text-neutral-700 leading-relaxed">
                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-neutral-400">Orders</h2>
                    <p>All products are made to order. By placing an order you agree that production may take 7–14 business days. Order cancellations are accepted within 24 hours of placement. After that, materials may already have been allocated.</p>
                </section>

                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-neutral-400">Payments</h2>
                    <p>All payments are processed securely via Paystack. Prices are listed in Ghanaian Cedis (GHS). We reserve the right to cancel orders if payment cannot be confirmed.</p>
                </section>

                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-neutral-400">Custom Orders</h2>
                    <p>Custom and bespoke orders require a confirmed deposit before production begins. Custom pieces are non-refundable once production has started, except in cases of manufacturing defect.</p>
                </section>

                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-neutral-400">Intellectual Property</h2>
                    <p>All designs, images, and content on this site are the exclusive property of MISS TOKYO. Reproduction without written consent is prohibited.</p>
                </section>

                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-neutral-400">Contact</h2>
                    <p>For any questions regarding these terms, email <a href="mailto:studio@misstokyo.shop" className="border-b border-black hover:text-neutral-500 transition-colors">studio@misstokyo.shop</a>.</p>
                </section>
            </div>
        </div>
    );
}
