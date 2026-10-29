import { test, expect } from "@playwright/test";
import { documentCanWhatsApp, documentNotice } from "../../../src/lib/whatsapp/documentNotice";

const DOC = { id: "0f8fad5b-d9cb-469f-a165-70867728950e", type: "invoice", amount: 1250, customer_name: "Ama Mensah", customer_phone: "233241234567" };

test("an invoice goes as document_ready with the amount and its /invoice link", () => {
    const n = documentNotice(DOC)!;
    expect(n.phone).toBe("233241234567");
    expect(n.templates).toEqual([{ key: "document_ready", values: ["Ama", "invoice", "1250.00", DOC.id] }]);
    expect(n.freeText).toContain(`https://misstokyo.shop/invoice/${DOC.id}`);
    expect(documentNotice({ ...DOC, type: "pay_link" })!.templates[0].values[1]).toBe("payment link");
});

test("never a quote (its page is not public), never without a number", () => {
    expect(documentCanWhatsApp("quotation")).toBe(false);
    expect(documentNotice({ ...DOC, type: "quotation" })).toBeNull();
    expect(documentNotice({ ...DOC, customer_phone: null })).toBeNull();
    expect(documentNotice({ ...DOC, customer_name: null })!.templates[0].values[0]).toBe("there");
});
