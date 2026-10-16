// The shop's FAQ and policy text. The FAQ, size guide and policy pages render
// it, and Ask Miss Tokyo's shop_info tool reads it, so the chat can never say
// something the pages don't. Change wording here, nowhere else.
import { paymentMethodsText } from "@/lib/checkout/paymentChannels";

export type Faq = { section: string; question: string; answer: string };

export const FAQS: Faq[] = [
    // Orders & Payment
    {
        section: "Orders & Payment",
        question: "How do I place an order?",
        answer: `Browse our shop and add items to your bag. When you're ready, proceed to checkout and pay by ${paymentMethodsText("or")}. You will receive an email confirmation with your order reference immediately after.`,
    },
    {
        section: "Orders & Payment",
        question: "What payment methods do you accept?",
        answer: `We accept ${paymentMethodsText()}. All payments are encrypted and processed securely.`,
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

export const SIZE_CHART = [
    { label: "XS — 6", bust: "32–34", waist: "25–26", hip: "35–36" },
    { label: "S — 8", bust: "34–35", waist: "27–28", hip: "37–38" },
    { label: "M — 10", bust: "36–37", waist: "29–30", hip: "39–40" },
    { label: "L — 12", bust: "38–39", waist: "30–32", hip: "41–44" },
    { label: "XL — 14", bust: "40–41", waist: "33–34", hip: "44–45" },
    { label: "XXL — 16", bust: "42–43", waist: "35–36", hip: "46–48" },
];

export const HOW_TO_MEASURE = [
    { label: "Bust", desc: "Measure around the fullest part of your chest, keeping the tape parallel to the floor." },
    { label: "Waist", desc: "Measure around your natural waistline — the narrowest part of your torso." },
    { label: "Hip", desc: "Measure around the fullest part of your hips and seat, approximately 8 inches below your waist." },
];

export const FIT_NOTE = "Miss Tokyo pieces are designed with a tailored, close-to-body silhouette. If you are between sizes, we recommend sizing up.";

export const REFUND_POLICY = {
    intro: "At Miss Tokyo, customer satisfaction is important to us. If you are not fully satisfied with your purchase, you may request a return within 72 hours of receiving your order.",
    eligibility: [
        "Items must be unused, unworn, and in original condition with tags attached.",
        "Returns must be requested within the 72-hour return window after delivery.",
        "Items damaged due to misuse or normal wear are not eligible for return.",
    ],
    approved: ["Offer an exchange, or", "Provide store credit equal to the purchase value."],
    note: "Delivery fees are non-refundable, and customers may be responsible for return shipping costs unless the item received was incorrect or defective.",
    contactEmail: "orders@misstokyo.shop",
};

export const SHIPPING_POLICY = {
    intro: "Miss Tokyo aims to deliver your order quickly and reliably.",
    processing: [
        "Orders are processed after payment confirmation.",
        "Delivery is completed within 2–3 business days after the order is confirmed.",
        "Delivery times may vary slightly due to location, weekends, or public holidays.",
    ],
    contactEmail: "orders@misstokyo.shop",
};

const faq = (q: string) => FAQS.find(f => f.question === q)?.answer ?? "";

export const PAYMENT_INFO = faq("What payment methods do you accept?");

// NEW TEXT (not from an existing page) — owner to approve before switch-on.
export const PREORDER_INFO = "Some pieces can be pre-ordered when they are sold out. The product page shows a Pre-Order button when this is possible, and the order is prepared when the piece is back.";

export const SHOP_INFO_TOPICS = ["delivery", "returns", "sizing", "preorders", "payment", "contact", "hours", "faq"] as const;
export type ShopInfoTopic = (typeof SHOP_INFO_TOPICS)[number];

/** Static text for a topic. Live fees, phone and hours are added by the caller. */
export function shopInfoText(topic: ShopInfoTopic): string {
    switch (topic) {
        case "delivery":
            return [...SHIPPING_POLICY.processing, faq("Do you offer pickup?"), faq("Are delivery fees refundable?")].join("\n");
        case "returns":
            return [REFUND_POLICY.intro, ...REFUND_POLICY.eligibility, `Once approved: ${REFUND_POLICY.approved.join(" ")}`, REFUND_POLICY.note,
                `To start a return, email ${REFUND_POLICY.contactEmail} within 72 hours of delivery.`].join("\n");
        case "sizing":
            return ["Size chart (inches): " + SIZE_CHART.map(s => `${s.label}: bust ${s.bust}, waist ${s.waist}, hip ${s.hip}`).join("; "),
                ...HOW_TO_MEASURE.map(m => `${m.label}: ${m.desc}`), FIT_NOTE].join("\n");
        case "preorders":
            return PREORDER_INFO;
        case "payment":
            return PAYMENT_INFO;
        case "contact":
            return `For help with an order, email ${SHIPPING_POLICY.contactEmail}.`;
        case "hours":
            return "Online orders are accepted 24/7.";
        case "faq":
            return FAQS.map(f => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n");
    }
}
