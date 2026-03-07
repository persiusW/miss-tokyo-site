export default function FAQPage() {
    const faqs = [
        {
            question: "How long does a custom order take?",
            answer: "Our custom orders are crafted entirely by hand in our Accra atelier. Please allow 4-6 weeks for material sourcing, construction, and final finishing before shipment."
        },
        {
            question: "What is your return policy?",
            answer: "Due to the individualized nature of our catalog, custom pieces are final sale. For standard collection items, we accept returns within 14 days of delivery, provided they are entirely unworn and in original packaging."
        },
        {
            question: "Do you ship internationally?",
            answer: "Yes. We offer worldwide shipping via our logistics partners. Shipping costs and estimated delivery times are calculated elegantly at checkout."
        },
        {
            question: "How do I care for my leather footwear?",
            answer: "We recommend storing your pieces in the provided dust bags away from direct sunlight. Treat the leather with a neutral conditioning cream every few months to maintain its supple character."
        }
    ];

    return (
        <div className="pt-32 pb-24 px-6 md:px-12 max-w-4xl mx-auto min-h-screen">
            <header className="mb-16 md:mb-24 text-center md:text-left">
                <h1 className="font-serif text-4xl md:text-5xl tracking-widest uppercase mb-6">FAQ</h1>
                <p className="text-sm tracking-[0.2em] text-neutral-500 uppercase">Frequently Asked Questions.</p>
            </header>

            <div className="space-y-12">
                {faqs.map((faq, index) => (
                    <div key={index} className="border-b border-neutral-200 pb-8">
                        <h3 className="font-serif text-xl tracking-wide uppercase mb-4 text-neutral-900">
                            {faq.question}
                        </h3>
                        <p className="text-neutral-600 leading-relaxed">
                            {faq.answer}
                        </p>
                    </div>
                ))}
            </div>

            <div className="mt-24 text-center md:text-left">
                <p className="text-sm tracking-widest uppercase text-neutral-500 mb-4">Still have questions?</p>
                <a href="/contact" className="text-xs uppercase tracking-widest font-semibold border-b border-black pb-1 hover:text-neutral-500 transition-colors">
                    Contact Us
                </a>
            </div>
        </div>
    );
}
