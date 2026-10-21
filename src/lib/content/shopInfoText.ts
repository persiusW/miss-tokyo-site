// shop_info's text, built from the pages as they are published now (the
// owner's saved version, else the original). Pure: the caller loads `content`.
import { PREORDER_INFO, type Faq, type ShopInfoTopic } from "@/content/shopInfo";
import { docToText, plainLine, type PolicyDoc, type SizeGuidePage } from "./pageDocs";

export type ShopContent = { faqs: Faq[]; refund: PolicyDoc; shipping: PolicyDoc; size: SizeGuidePage };

export function shopInfoTextFor(topic: ShopInfoTopic, c: ShopContent): string {
    const faq = (q: string) => c.faqs.find(f => f.question === q)?.answer ?? "";
    switch (topic) {
        case "delivery":
            return [docToText(c.shipping), faq("Do you offer pickup?"), faq("Are delivery fees refundable?")].filter(Boolean).join("\n");
        case "returns":
            return docToText(c.refund);
        case "sizing":
            return [
                "Size chart: " + c.size.rows.map(s => `${s.label}: bust ${s.bust}, waist ${s.waist}, hip ${s.hip}`).join("; "),
                c.size.note,
                ...c.size.measure.map(m => `${m.label}: ${m.desc}`),
                c.size.fitNote,
            ].filter(Boolean).join("\n");
        case "preorders":
            return PREORDER_INFO;
        case "payment":
            return faq("What payment methods do you accept?");
        case "contact": {
            const email = plainLine(c.shipping.sections.map(s => s.body).join(" ")).match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)?.[0];
            return email ? `For help with an order, email ${email}.` : "";
        }
        case "hours":
            return "Online orders are accepted 24/7.";
        case "faq":
            return c.faqs.map(f => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n");
    }
}
