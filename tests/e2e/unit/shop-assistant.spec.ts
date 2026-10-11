import { test, expect } from "@playwright/test";
import { normaliseWaNumber, SHOP_SETTING_VALIDATORS } from "../../../src/lib/ai/shopAssistant/settingsRules";

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
