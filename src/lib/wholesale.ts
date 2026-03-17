export type WholesaleTiers = {
    tier1Min: number;
    tier1Max: number;
    tier2Min: number;
    tier2Max: number;
    tier3Min: number;
    tier3Max: number;
};

export type WholesalePrices = {
    tier1: number | null;
    tier2: number | null;
    tier3: number | null;
};

export type WholesaleData = {
    enabled: boolean;
    prices: WholesalePrices;
    tiers: WholesaleTiers;
};

/**
 * Resolves the per-unit price for a wholesale user based on quantity.
 * Checks from the highest tier down. Falls back to retail price if no tier applies.
 */
export function resolveWholesalePrice(
    quantity: number,
    retailPrice: number,
    prices: WholesalePrices,
    tiers: WholesaleTiers
): number {
    if (prices.tier3 !== null && quantity >= tiers.tier3Min) return prices.tier3;
    if (prices.tier2 !== null && quantity >= tiers.tier2Min) return prices.tier2;
    if (prices.tier1 !== null && quantity >= tiers.tier1Min) return prices.tier1;
    return retailPrice;
}

/** Returns which tier is active for a given quantity, or null if none. */
export function getActiveTier(
    quantity: number,
    tiers: WholesaleTiers
): 1 | 2 | 3 | null {
    if (quantity >= tiers.tier3Min) return 3;
    if (quantity >= tiers.tier2Min) return 2;
    if (quantity >= tiers.tier1Min) return 1;
    return null;
}
