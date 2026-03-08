export default function PrivacyPage() {
    return (
        <div className="pt-32 pb-24 px-6 md:px-12 max-w-3xl mx-auto min-h-screen">
            <h1 className="font-serif text-4xl md:text-5xl tracking-widest uppercase mb-16">Privacy Policy</h1>

            <div className="space-y-12 text-sm text-neutral-700 leading-relaxed">
                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-neutral-400">Information We Collect</h2>
                    <p>We collect information you provide directly — such as your name, email address, phone number, and shipping address — when you place an order, submit a custom request, or contact us.</p>
                </section>

                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-neutral-400">How We Use Your Information</h2>
                    <p>Your information is used solely to process orders, communicate order updates, and respond to inquiries. We do not sell or share your data with third parties except where required to fulfil your order (e.g. payment processing via Paystack).</p>
                </section>

                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-neutral-400">Data Storage</h2>
                    <p>All data is stored securely via Supabase infrastructure hosted in the EU. Payment transactions are processed by Paystack and we do not store card details.</p>
                </section>

                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-neutral-400">Contact</h2>
                    <p>For any privacy concerns, contact us at <a href="mailto:studio@badu.com" className="border-b border-black hover:text-neutral-500 transition-colors">studio@badu.com</a>.</p>
                </section>
            </div>
        </div>
    );
}
