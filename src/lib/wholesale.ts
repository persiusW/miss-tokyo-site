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
    // Optional explicit per-unit prices — set when product or category has a price override.
    // When present, these take precedence over percentage discounts.
    tier1_price?: number | null;
    tier2_price?: number | null;
    tier3_price?: number | null;
}

/**
 * Resolves the final unit price based on quantity tiers.
 * If the tiers carry explicit per-unit prices (tier*_price), those are used directly.
 * Otherwise the tier's percentage discount is applied to basePrice.
 * Quantities below tier1_min receive basePrice (no wholesale benefit).
 */
export function resolveWholesalePrice(
    quantity: number,
    basePrice: number,
    tiers: WholesaleTiers
): number {
    if (quantity >= tiers.tier3_min) {
        return tiers.tier3_price != null ? tiers.tier3_price : basePrice * (1 - tiers.tier3_discount / 100);
    }
    if (quantity >= tiers.tier2_min && quantity <= tiers.tier2_max) {
        return tiers.tier2_price != null ? tiers.tier2_price : basePrice * (1 - tiers.tier2_discount / 100);
    }
    if (quantity >= tiers.tier1_min && quantity <= tiers.tier1_max) {
        return tiers.tier1_price != null ? tiers.tier1_price : basePrice * (1 - tiers.tier1_discount / 100);
    }
    return basePrice;
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
