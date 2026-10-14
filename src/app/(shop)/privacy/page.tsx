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
                    <p>Your information is used solely to process orders, communicate order updates, and respond to inquiries. We do not sell your data. We share it only with the service providers that help us do this: Paystack for payments, our SMS and email providers for order updates, and, when you chat with us, the WhatsApp and AI providers named below.</p>
                </section>

                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-neutral-400">WhatsApp and Our AI Assistant</h2>
                    <p>When you message us on WhatsApp or chat with Ask Miss Tokyo on our website, your messages (including photos you send), your WhatsApp name and number, and any order details you give are processed to answer you, take orders and help with payment. WhatsApp messages reach us through Chatbots Africa, our WhatsApp provider, and our integration is operated by Dashttp. Replies are written with the help of an AI model provided by Anthropic. A member of our team can see these conversations and will take over whenever you ask.</p>
                    <p className="mt-4">The raw messages we receive and our assistant&apos;s chat records are deleted after 30 days. Your conversation history with us is kept so our team can serve you; you can ask us to delete it at any time.</p>
                </section>

                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-neutral-400">Data Storage</h2>
                    <p>All data is stored securely via Supabase infrastructure hosted in the EU. Payment transactions are processed by Paystack and we do not store card details.</p>
                </section>

                <section>
                    <h2 className="text-xs font-semibold uppercase tracking-widest mb-4 text-neutral-400">Contact</h2>
                    <p>For any privacy concerns, contact us at <a href="mailto:studio@misstokyo.shop" className="border-b border-black hover:text-neutral-500 transition-colors">studio@misstokyo.shop</a>.</p>
                </section>
            </div>
        </div>
    );
}
