import { test, expect } from "@playwright/test";
import { giftCardNotices, giftExpiry, type GiftCardWhatsApp } from "../../../src/lib/whatsapp/giftCardNotices";

const NOW = new Date("2026-10-29T12:00:00Z");
const card = (o: Partial<GiftCardWhatsApp> = {}): GiftCardWhatsApp => ({
    mode: "email", amount: 300, code: "MT-AB12-CD34-EF56", expiresAt: "2027-10-29T12:00:00Z",
    senderName: "Ama Mensah", senderPhone: "233241234567", recipientName: "Abena Owusu", recipientPhone: "233201112222", ...o,
});

test("a card kept by the buyer goes to the buyer's number as gift_card_ready", () => {
    const [n, ...rest] = giftCardNotices(card({ mode: "self", recipientPhone: null }), NOW);
    expect(rest).toHaveLength(0);
    expect(n.phone).toBe("233241234567");
    expect(n.templates).toEqual([{ key: "gift_card_ready", values: ["Ama", "300.00", "MT-AB12-CD34-EF56", "29 Oct 2027"] }]);
    expect(n.freeText).toContain("Your gift card code is MT-AB12-CD34-EF56");
});

test("a card sent to someone: the card to the recipient, a confirmation to the buyer", () => {
    const [toRecipient, toBuyer] = giftCardNotices(card(), NOW);
    expect(toRecipient.phone).toBe("233201112222");
    expect(toRecipient.templates[0]).toEqual({ key: "gift_card_from_sender", values: ["Abena", "300.00", "Ama Mensah", "MT-AB12-CD34-EF56", "29 Oct 2027"] });
    expect(toBuyer.phone).toBe("233241234567");
    expect(toBuyer.templates[0]).toEqual({ key: "gift_card_sent", values: ["Ama", "300.00", "Abena Owusu", "29 Oct 2026"] });
    // The buyer's confirmation never carries the code.
    expect(toBuyer.freeText).not.toContain("MT-AB12");
});

test("only numbers that were given; one message when the buyer sent it to their own number", () => {
    expect(giftCardNotices(card({ senderPhone: null, recipientPhone: null }), NOW)).toEqual([]);
    expect(giftCardNotices(card({ mode: "self", senderPhone: null }), NOW)).toEqual([]);
    expect(giftCardNotices(card({ senderPhone: null }), NOW).map(n => n.templates[0].key)).toEqual(["gift_card_from_sender"]);
    expect(giftCardNotices(card({ recipientPhone: null }), NOW).map(n => n.templates[0].key)).toEqual(["gift_card_sent"]);
    expect(giftCardNotices(card({ recipientPhone: "233241234567" }), NOW).map(n => n.templates[0].key)).toEqual(["gift_card_from_sender"]);
});

test("no expiry reads 'never'; an issued card with no sender is from Miss Tokyo", () => {
    expect(giftExpiry(null)).toBe("never");
    expect(giftExpiry("not a date")).toBe("never");
    const [n] = giftCardNotices(card({ senderName: "", senderPhone: null, expiresAt: null }), NOW);
    expect(n.templates[0].values).toEqual(["Abena", "300.00", "Miss Tokyo", "MT-AB12-CD34-EF56", "never"]);
    expect(n.freeText).toContain("Expiry: never.");
});
