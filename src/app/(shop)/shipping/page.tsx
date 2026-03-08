export default function ShippingPage() {
    return (
        <div className="pt-32 pb-24 px-6 md:px-12 max-w-3xl mx-auto min-h-screen">
            <h1 className="font-serif text-4xl md:text-5xl tracking-widest uppercase mb-16">Shipping & Returns</h1>

            <div className="space-y-16 text-neutral-700 leading-relaxed">
                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-6 text-neutral-400">Delivery</h2>
                    <div className="space-y-4 text-sm">
                        <p>All orders are handcrafted to order. Please allow 7–14 business days for production before dispatch.</p>
                        <p>We deliver within Ghana and offer international shipping on request. Domestic delivery typically takes 2–5 business days after dispatch.</p>
                        <p>Store pickup is available from our Accra atelier by appointment.</p>
                    </div>
                </section>

                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-6 text-neutral-400">Returns & Exchanges</h2>
                    <div className="space-y-4 text-sm">
                        <p>As each piece is made to order, we do not accept returns unless the item arrives damaged or defective.</p>
                        <p>If your order arrives with a manufacturing defect, please contact us within 7 days of receipt at <a href="mailto:studio@badu.com" className="border-b border-black hover:text-neutral-500 transition-colors">studio@badu.com</a>.</p>
                        <p>Size exchanges are considered on a case-by-case basis. Please reach out before placing your order if you have any sizing questions.</p>
                    </div>
                </section>

                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-6 text-neutral-400">Contact</h2>
                    <p className="text-sm">For all shipping and returns enquiries, email <a href="mailto:studio@badu.com" className="border-b border-black hover:text-neutral-500 transition-colors">studio@badu.com</a>.</p>
                </section>
            </div>
        </div>
    );
}
