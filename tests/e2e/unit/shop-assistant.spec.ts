import { test, expect } from "@playwright/test";
import { normaliseWaNumber, SHOP_SETTING_VALIDATORS } from "../../../src/lib/ai/shopAssistant/settingsRules";
import { cleanTrackQuery } from "../../../src/lib/orders/trackQuery";
import { FAQS, SIZE_CHART, shopInfoText, SHOP_INFO_TOPICS } from "../../../src/content/shopInfo";

test("WhatsApp numbers normalise to 233 + 9 digits, or null", () => {
    expect(normaliseWaNumber("055 389 8704")).toBe("233553898704");
    expect(normaliseWaNumber("+233 55 389 8704")).toBe("233553898704");
    expect(normaliseWaNumber("553898704")).toBe("233553898704");
    expect(normaliseWaNumber("0553898704x")).toBe("233553898704");
    expect(normaliseWaNumber("12345")).toBeNull();
    expect(normaliseWaNumber("+44 7700 900123")).toBeNull();
    expect(normaliseWaNumber("")).toBeNull();
    expect(normaliseWaNumber(null)).toBeNull();
});

test("shop settings validators", () => {
    const v = SHOP_SETTING_VALIDATORS;
    expect(v.shop_assistant_enabled(true)).toBe(true);
    expect(v.shop_assistant_enabled("true")).toBe(false);
    expect(v.shop_assistant_daily_messages_per_visitor(20)).toBe(true);
    expect(v.shop_assistant_daily_messages_per_visitor(0)).toBe(false);
    expect(v.shop_assistant_daily_messages_per_visitor(201)).toBe(false);
    expect(v.shop_assistant_daily_messages_per_visitor(2.5)).toBe(false);
    expect(v.shop_assistant_cap_share_pct(0)).toBe(true);
    expect(v.shop_assistant_cap_share_pct(100)).toBe(true);
    expect(v.shop_assistant_cap_share_pct(101)).toBe(false);
    expect(v.shop_whatsapp_number("")).toBe(true);
    expect(v.shop_whatsapp_number("233553898704")).toBe(true);
    expect(v.shop_whatsapp_number("0553898704")).toBe(false); // the page normalises before saving
    expect(v.shop_whatsapp_number(233553898704)).toBe(false);
});

test("order lookups clean refs, emails and phones the way /track always has", () => {
    expect(cleanTrackQuery({ ref: "#3bbb1012", email: " Ama@Gmail.com " })).toEqual({ ref: "3BBB1012", email: "ama@gmail.com", phone: null });
    expect(cleanTrackQuery({ ref: "3BBB 1012", phone: "+233 24 123 4567" })).toEqual({ ref: "3BBB1012", email: null, phone: "233241234567" });
    expect(cleanTrackQuery({ ref: "order 3bbb1012" }).ref).toBe("3BBB1012");      // /track alone would read "DE3BBB1012"
    expect(cleanTrackQuery({ ref: "3BBB10" }).ref).toBeNull();                     // too short
    expect(cleanTrackQuery({ ref: "3BBB1012", email: "not-an-email" }).email).toBeNull();
    expect(cleanTrackQuery({ ref: "3BBB1012", phone: "0241" }).phone).toBeNull();
    expect(cleanTrackQuery({})).toEqual({ ref: null, email: null, phone: null });
});

test("shop info: every topic has text, payment never mentions cash", () => {
    for (const t of SHOP_INFO_TOPICS) expect(shopInfoText(t).length).toBeGreaterThan(20);
    expect(shopInfoText("payment")).not.toMatch(/cash/i);
    expect(shopInfoText("payment")).toMatch(/Paystack/);
    expect(shopInfoText("returns")).toMatch(/72 hours/);
    expect(shopInfoText("sizing")).toMatch(/XL — 14/);
    expect(FAQS.length).toBe(18);
    expect(SIZE_CHART.length).toBe(6);
});
