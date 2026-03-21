export interface WholesalePrices {
    tier1: number | null;
    tier2: number | null;
    tier3: number | null;
}

export interface WholesaleTierConfig {
    tier1Min: number;
    tier1Max: number;
    tier2Min: number;
    tier2Max: number;
    tier3Min: number;
    tier3Max: number;
}

export interface WholesaleData {
    enabled: boolean;
    tiers: WholesaleTierConfig;
    prices: WholesalePrices;
}

/** CamelCase-based tier resolver used by gallery/quick-view checkout forms. */
export function getActiveTier(quantity: number, tiers: WholesaleTierConfig): number | null {
    if (quantity >= tiers.tier3Min) return 3;
    if (quantity >= tiers.tier2Min) return 2;
    if (quantity >= tiers.tier1Min) return 1;
    return null;
}

export interface WholesaleTiers {
    tier1_min: number;
    tier1_max: number;
    tier1_discount: number;
    tier2_min: number;
    tier2_max: number;
    tier2_discount: number;
    tier3_min: number;
    tier3_max: number;
    tier3_discount: number;
}

/**
 * Resolves the final unit price based on quantity tiers.
 * If quantity exceeds the Tier 3 max, it applies the Tier 3 discount.
 */
export function resolveWholesalePrice(
    quantity: number,
    basePrice: number,
    tiers: WholesaleTiers
): number {
    let discount = 0;

    if (quantity >= tiers.tier1_min && quantity <= tiers.tier1_max) {
        discount = tiers.tier1_discount;
    } else if (quantity >= tiers.tier2_min && quantity <= tiers.tier2_max) {
        discount = tiers.tier2_discount;
    } else if (quantity >= tiers.tier3_min) {
        // If exceeds Tier 3 max, continue applying Tier 3 discount
        discount = tiers.tier3_discount;
    }

    // Apply percentage discount
    return basePrice * (1 - (discount / 100));
}

/**
 * Utility to identify which tier is currently active for a given quantity.
 */
export function getActiveWholesaleTier(
    quantity: number,
    tiers: WholesaleTiers
): number | null {
    if (quantity >= tiers.tier3_min) return 3;
    if (quantity >= tiers.tier2_min) return 2;
    if (quantity >= tiers.tier1_min) return 1;
    return null;
}
