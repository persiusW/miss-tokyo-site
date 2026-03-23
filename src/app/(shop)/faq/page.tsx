import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "FAQ — Miss Tokyo",
    description: "Answers to common questions about orders, returns, shipping, sizing, and more.",
};

const FAQS = [
    // Orders & Payment
    {
        section: "Orders & Payment",
        question: "How do I place an order?",
        answer: "Browse our shop and add items to your bag. When you're ready, proceed to checkout and complete payment via Paystack. You will receive an email confirmation with your order reference immediately after.",
    },
    {
        section: "Orders & Payment",
        question: "What payment methods do you accept?",
        answer: "We accept all major cards and mobile money payments through Paystack. All transactions are encrypted and processed securely.",
    },
    {
        section: "Orders & Payment",
        question: "Can I cancel or change my order after placing it?",
        answer: "Orders begin processing immediately after payment is confirmed. Please contact us at orders@misstokyo.shop as soon as possible if you need to make a change — we will do our best to.",
    },

    // Shipping & Delivery
    {
        section: "Shipping & Delivery",
        question: "How long does delivery take?",
        answer: "Orders are processed after payment confirmation and delivered within 2–3 business days. Delivery times may vary slightly due to location, weekends, or public holidays.",
    },
    {
        section: "Shipping & Delivery",
        question: "Do you offer pickup?",
        answer: "Yes. You can select in-store pickup at checkout. Once your order is ready, you will receive an SMS and email with pickup instructions, our address, and contact details.",
    },
    {
        section: "Shipping & Delivery",
        question: "How can I track my order?",
        answer: "Use our Track Order page — enter your 8-character order reference (found in your confirmation email) and the email address you used at checkout.",
    },
    {
        section: "Shipping & Delivery",
        question: "Are delivery fees refundable?",
        answer: "Delivery fees are non-refundable, even in the case of a return. Customers may also be responsible for return shipping costs unless the item received was incorrect or defective.",
    },

    // Returns & Refunds
    {
        section: "Returns & Refunds",
        question: "What is your return window?",
        answer: "You may request a return within 72 hours of receiving your order. Requests made after this window cannot be accepted.",
    },
    {
        section: "Returns & Refunds",
        question: "What items are eligible for return?",
        answer: "Items must be unused, unworn, and in their original condition with tags attached. Items damaged through misuse or normal wear are not eligible.",
    },
    {
        section: "Returns & Refunds",
        question: "Do you offer cash refunds?",
        answer: "We do not offer cash refunds. Approved returns are resolved as an exchange or store credit equal to the purchase value.",
    },
    {
        section: "Returns & Refunds",
        question: "How do I initiate a return?",
        answer: "Email orders@misstokyo.shop within 72 hours of delivery with your order reference and reason for return. Our team will guide you through the next steps.",
    },

    // Sizing & Fit
    {
        section: "Sizing & Fit",
        question: "How do I find my size?",
        answer: "Refer to our Size Guide for measurements by bust, waist, and hip. Miss Tokyo pieces are designed with a tailored, close-to-body silhouette — if you are between sizes, we recommend sizing up.",
    },
    {
        section: "Sizing & Fit",
        question: "Are all garments true to size?",
        answer: "Each piece is handmade in our Accra atelier, so slight variations are a mark of craft. Our size chart reflects the finished garment measurements. Contact us if you need guidance on a specific piece.",
    },

    // Products & Craft
    {
        section: "Products & Craft",
        question: "Are your pieces handmade?",
        answer: "Yes. Every Miss Tokyo garment is crafted entirely by hand in our Accra atelier. This means each piece is unique, and slight variations in colour or finish are intentional and expected.",
    },
    {
        section: "Products & Craft",
        question: "Do product images accurately reflect the items?",
        answer: "We aim to display products as accurately as possible. However, slight colour or design differences may occur due to lighting conditions or screen settings.",
    },
    {
        section: "Products & Craft",
        question: "How do I care for my Miss Tokyo piece?",
        answer: "Specific care instructions vary by garment and material. As a general rule, store pieces away from direct sunlight and follow the care label. For leather or delicate fabrics, avoid machine washing.",
    },

    // Privacy & Data
    {
        section: "Privacy & Data",
        question: "What personal information do you collect?",
        answer: "We collect your name, email, phone number, delivery address, and payment/order information. Usage data is also collected to improve your experience.",
    },
    {
        section: "Privacy & Data",
        question: "Do you share my data with third parties?",
        answer: "We do not sell your personal data. It is only shared where strictly necessary — with our payment processor (Paystack), delivery partners, or when required by law.",
    },
];

// Group by section
const sections = FAQS.reduce<Record<string, typeof FAQS>>((acc, faq) => {
    if (!acc[faq.section]) acc[faq.section] = [];
    acc[faq.section].push(faq);
    return acc;
}, {});

export default function FAQPage() {
    return (
        <div className="pt-32 pb-24 px-6 md:px-12 max-w-3xl mx-auto min-h-screen">
            <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 mb-4">Help</p>
            <h1 className="font-serif text-4xl md:text-5xl tracking-widest uppercase mb-6">FAQ</h1>
            <p className="text-sm tracking-[0.1em] text-neutral-500 mb-16">Frequently asked questions.</p>

            <div className="space-y-16">
                {Object.entries(sections).map(([section, faqs]) => (
                    <div key={section}>
                        <h2 className="text-[10px] uppercase tracking-[0.3em] font-semibold text-neutral-400 mb-8 border-b border-neutral-100 pb-4">
                            {section}
                        </h2>
                        <div className="space-y-8">
                            {faqs.map((faq, i) => (
                                <div key={i} className="border-b border-neutral-100 pb-8">
                                    <h3 className="text-sm font-semibold uppercase tracking-[0.12em] mb-3 text-neutral-900">
                                        {faq.question}
                                    </h3>
                                    <p className="text-sm text-neutral-600 leading-relaxed">
                                        {faq.answer}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-20 border-t border-neutral-100 pt-12">
                <p className="text-sm tracking-widest uppercase text-neutral-500 mb-4">Still have questions?</p>
                <Link
                    href="/contact"
                    className="text-xs uppercase tracking-widest font-semibold border-b border-black pb-1 hover:text-neutral-500 transition-colors"
                >
                    Contact Us →
                </Link>
            </div>
        </div>
    );
}
