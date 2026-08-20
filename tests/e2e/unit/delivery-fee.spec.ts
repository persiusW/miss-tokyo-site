import { test, expect } from "@playwright/test";
import {
    DELIVERY_DEFAULTS,
    parseDeliverySettings,
    parseZone,
    resolveDeliveryFee,
    zoneForRegion,
    zoneLabel,
} from "../../../src/lib/delivery";

const ON = { enabled: true, accra: 35, outside: 20 };

test.describe("zoneForRegion", () => {
    test("Greater Accra maps to the accra zone", () => {
        expect(zoneForRegion("Greater Accra")).toBe("accra");
    });

    test("region matching ignores case and surrounding space", () => {
        expect(zoneForRegion("  greater accra ")).toBe("accra");
    });

    test("every other Ghanaian region maps to outside", () => {
        expect(zoneForRegion("Ashanti")).toBe("outside");
        expect(zoneForRegion("Western")).toBe("outside");
        expect(zoneForRegion("Volta")).toBe("outside");
    });

    test("missing region falls back to outside, the cheaper zone", () => {
        expect(zoneForRegion(null)).toBe("outside");
        expect(zoneForRegion(undefined)).toBe("outside");
        expect(zoneForRegion("")).toBe("outside");
    });
});

test.describe("resolveDeliveryFee", () => {
    test("charges the Accra rate for an Accra delivery in Ghana", () => {
        expect(resolveDeliveryFee({
            settings: ON, country: "Ghana", deliveryMethod: "delivery", zone: "accra",
        })).toBe(35);
    });

    test("charges the outside rate for an outside-Accra delivery in Ghana", () => {
        expect(resolveDeliveryFee({
            settings: ON, country: "Ghana", deliveryMethod: "delivery", zone: "outside",
        })).toBe(20);
    });

    test("charges nothing while the feature flag is off", () => {
        expect(resolveDeliveryFee({
            settings: { ...ON, enabled: false }, country: "Ghana",
            deliveryMethod: "delivery", zone: "accra",
        })).toBe(0);
    });

    test("charges nothing for store pickup", () => {
        expect(resolveDeliveryFee({
            settings: ON, country: "Ghana", deliveryMethod: "pickup", zone: "accra",
        })).toBe(0);
    });

    test("charges nothing outside Ghana", () => {
        expect(resolveDeliveryFee({
            settings: ON, country: "Nigeria", deliveryMethod: "delivery", zone: "accra",
        })).toBe(0);
    });

    test("country matching ignores case and space", () => {
        expect(resolveDeliveryFee({
            settings: ON, country: " ghana ", deliveryMethod: "delivery", zone: "accra",
        })).toBe(35);
    });

    test("zone matching ignores case and space", () => {
        expect(resolveDeliveryFee({
            settings: ON, country: "Ghana", deliveryMethod: "delivery", zone: " Accra ",
        })).toBe(35);
        expect(resolveDeliveryFee({
            settings: ON, country: "Ghana", deliveryMethod: "delivery", zone: "OUTSIDE",
        })).toBe(20);
    });

    test("charges nothing for an unrecognised zone rather than guessing", () => {
        expect(resolveDeliveryFee({
            settings: ON, country: "Ghana", deliveryMethod: "delivery", zone: "kumasi",
        })).toBe(0);
        expect(resolveDeliveryFee({
            settings: ON, country: "Ghana", deliveryMethod: "delivery", zone: null,
        })).toBe(0);
    });

    test("a missing delivery method is treated as delivery", () => {
        expect(resolveDeliveryFee({
            settings: ON, country: "Ghana", deliveryMethod: null, zone: "accra",
        })).toBe(35);
    });

    test("rounds to two decimal places", () => {
        expect(resolveDeliveryFee({
            settings: { enabled: true, accra: 35.005, outside: 20 },
            country: "Ghana", deliveryMethod: "delivery", zone: "accra",
        })).toBe(35.01);
    });

    test("a negative configured rate is clamped to zero", () => {
        expect(resolveDeliveryFee({
            settings: { enabled: true, accra: -5, outside: 20 },
            country: "Ghana", deliveryMethod: "delivery", zone: "accra",
        })).toBe(0);
    });
});

test.describe("parseDeliverySettings", () => {
    test("reads a settings row", () => {
        expect(parseDeliverySettings({
            delivery_fees_enabled: true,
            delivery_fee_accra: "35.00",
            delivery_fee_outside: "20.00",
        })).toEqual({ enabled: true, accra: 35, outside: 20 });
    });

    test("a null row degrades to the disabled defaults", () => {
        expect(parseDeliverySettings(null)).toEqual(DELIVERY_DEFAULTS);
        expect(DELIVERY_DEFAULTS.enabled).toBe(false);
    });

    test("a row missing the columns degrades to the disabled defaults", () => {
        expect(parseDeliverySettings({})).toEqual(DELIVERY_DEFAULTS);
    });

    test("non-numeric rates degrade to the defaults rather than NaN", () => {
        expect(parseDeliverySettings({
            delivery_fees_enabled: true,
            delivery_fee_accra: "abc",
            delivery_fee_outside: null,
        })).toEqual({ enabled: true, accra: 35, outside: 20 });
    });
});

test.describe("zoneLabel", () => {
    test("labels both zones", () => {
        expect(zoneLabel("accra")).toBe("Within Accra");
        expect(zoneLabel("outside")).toBe("Outside Accra");
    });

    test("an unknown zone labels as Delivery", () => {
        expect(zoneLabel(null)).toBe("Delivery");
        expect(zoneLabel("moon")).toBe("Delivery");
    });
});

test.describe("parseZone", () => {
    test("canonicalises both zones regardless of case and space", () => {
        expect(parseZone("accra")).toBe("accra");
        expect(parseZone(" Accra ")).toBe("accra");
        expect(parseZone("OUTSIDE")).toBe("outside");
    });

    test("returns null for anything else rather than guessing", () => {
        expect(parseZone("kumasi")).toBe(null);
        expect(parseZone("")).toBe(null);
        expect(parseZone(null)).toBe(null);
        expect(parseZone(undefined)).toBe(null);
    });
});
