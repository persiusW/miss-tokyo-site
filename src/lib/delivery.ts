// Flat-rate delivery pricing.
//
// One resolver, four callers: storefront checkout, /api/paystack/initialize,
// the POS till, and /api/pos/send-link. Keeping the arithmetic here is what
// stops a customer being shown one total and charged another.
//
// Every failure mode returns 0. A missing settings row, an unapplied
// migration, an unrecognised zone — all degrade to exactly the behaviour
// production had before this feature existed, rather than throwing inside a
// checkout.

export type DeliveryZone = "accra" | "outside";

export type DeliveryFeeSettings = {
    enabled: boolean;
    accra: number;
    outside: number;
};

/** Used whenever settings cannot be read. Disabled, so the fallback is free. */
export const DELIVERY_DEFAULTS: DeliveryFeeSettings = {
    enabled: false,
    accra: 35,
    outside: 20,
};

/** The one region that gets the Accra rate. Matches @/lib/geo's GHANA_REGIONS entry. */
const ACCRA_REGION = "greater accra";

const norm = (v: unknown): string => (typeof v === "string" ? v.trim().toLowerCase() : "");

/**
 * Greater Accra gets the Accra rate; everywhere else, including a blank or
 * unknown region, gets the cheaper outside rate. Defaulting to the cheaper
 * zone means a bad region string undercharges rather than surprising the
 * customer with a higher figure than they were quoted.
 */
export function zoneForRegion(region?: string | null): DeliveryZone {
    return norm(region) === ACCRA_REGION ? "accra" : "outside";
}

export function zoneLabel(zone: string | null | undefined): string {
    if (zone === "accra") return "Within Accra";
    if (zone === "outside") return "Outside Accra";
    return "Delivery";
}

/**
 * Reads the three store_settings columns off a row of unknown shape. A row
 * that predates the migration simply has no such keys and yields the disabled
 * defaults.
 */
export function parseDeliverySettings(row: unknown): DeliveryFeeSettings {
    if (!row || typeof row !== "object") return DELIVERY_DEFAULTS;
    const r = row as Record<string, unknown>;
    if (!("delivery_fees_enabled" in r)) return DELIVERY_DEFAULTS;

    const num = (v: unknown, fallback: number): number => {
        // Number(null) and Number("") are both 0, which is finite — so a null
        // or blank rate would resolve to free delivery rather than to the
        // configured default. Treat absence as absence.
        if (v === null || v === undefined || v === "") return fallback;
        const n = Number(v);
        return Number.isFinite(n) ? n : fallback;
    };

    return {
        enabled: r.delivery_fees_enabled === true,
        accra: num(r.delivery_fee_accra, DELIVERY_DEFAULTS.accra),
        outside: num(r.delivery_fee_outside, DELIVERY_DEFAULTS.outside),
    };
}

/**
 * The charge. Returns 0 unless the flag is on, the order is a delivery, the
 * destination is Ghana, and the zone is one we recognise.
 *
 * A missing deliveryMethod counts as delivery: the storefront defaults to
 * delivery, and only the POS explicitly defaults to pickup (and always sends
 * the field).
 */
export function resolveDeliveryFee(args: {
    settings: DeliveryFeeSettings;
    country?: string | null;
    deliveryMethod?: string | null;
    zone?: string | null;
}): number {
    const { settings, country, deliveryMethod, zone } = args;

    if (!settings?.enabled) return 0;
    if (deliveryMethod != null && norm(deliveryMethod) !== "delivery") return 0;
    if (norm(country) !== "ghana") return 0;

    // Normalised like country and deliveryMethod above. The zone arrives from
    // client metadata on the storefront path, so "Accra" or " accra " must
    // resolve to the Accra rate rather than silently to free delivery.
    const z = norm(zone);
    const rate = z === "accra" ? settings.accra
        : z === "outside" ? settings.outside
        : 0;

    if (!Number.isFinite(rate) || rate <= 0) return 0;
    return parseFloat(rate.toFixed(2));
}
