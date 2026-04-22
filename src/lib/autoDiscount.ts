/**
 * Automatic Discount Engine
 *
 * Pure TypeScript — no side effects, no DB calls.
 * Runs identically in the browser (checkout page) and on the server (API routes).
 *
 * Stacking rules:
 * - Multiple rules CAN all fire simultaneously when they target different items.
 * - If the same item qualifies for two rules, the higher-discount rule wins (greedy).
 * - Coupon / gift-card codes only apply to the subtotal of items NOT covered by auto discounts.
 * - When every item in the cart is covered, coupons are blocked entirely.
 */

import type { CartItem } from "@/store/useCart";

// ── Public types ──────────────────────────────────────────────────────────────

export type AutoDiscountRule = {
    id: string;
    title: string;
    discount_type: "PERCENTAGE" | "FIXED";
    discount_value: number;
    applies_to: "ALL_PRODUCTS" | "SPECIFIC_CATEGORIES" | "SPECIFIC_PRODUCTS";
    target_category_ids: string[];
    target_product_ids: string[];
    min_quantity: number;
    quantity_scope: "ACROSS_TARGET" | "PER_PRODUCT";
    min_order_amount: number | null;
};

/** Maps productId → category IDs that product belongs to. */
export type ProductCategoryMap = Record<string, string[]>;

export type AppliedRule = {
    id: string;
    title: string;
    discountAmount: number;
    coveredProductIds: string[];
};

/**
 * A rule the customer is close to unlocking — they have eligible items but
 * haven't hit the minimum quantity yet.
 */
export type NearMissRule = {
    id: string;
    title: string;
    /** How many more items are needed to trigger the discount. */
    needed: number;
    scope: "ACROSS_TARGET" | "PER_PRODUCT";
    /** Human-readable label for what to add, e.g. "Dress" or "item". Sourced from rule.target_label. */
    targetLabel: string;
};

export type AutoDiscountResult = {
    totalAutoDiscount: number;
    appliedRules: AppliedRule[];
    /** Set of productIds whose items are fully covered by an auto discount. */
    coveredProductIds: Set<string>;
    /** Human-readable summary label for the order, e.g. "3 for 120, 2 for 180" */
    label: string;
    /** Rules that almost qualified — customer has eligible items but not enough qty. */
    nearMisses: NearMissRule[];
};

/**
 * Given a product's id + category ids and a list of active rules, return the
 * single best rule to surface as a ribbon on a product card / PDP.
 *
 * Priority: single-item applicable rules (min_quantity ≤ 1) with the highest
 * discount_value win. Falls back to the first multi-item rule (ribbon only).
 * Returns null when no rule matches.
 */
export function getApplicableRule(
    productId: string,
    categoryIds: string[] | null,
    rules: AutoDiscountRule[],
): AutoDiscountRule | null {
    const cats = categoryIds ?? [];
    const matching = rules.filter(r => {
        if (r.applies_to === "ALL_PRODUCTS") return true;
        if (r.applies_to === "SPECIFIC_PRODUCTS") return r.target_product_ids.includes(productId);
        if (r.applies_to === "SPECIFIC_CATEGORIES") return cats.some(cid => r.target_category_ids.includes(cid));
        return false;
    });
    if (matching.length === 0) return null;
    const singleItem = matching.filter(r => r.min_quantity <= 1);
    if (singleItem.length > 0)
        return singleItem.reduce((a, b) => b.discount_value > a.discount_value ? b : a);
    return matching[0];
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Returns cart items that match the rule's applies_to scope. */
function getEligibleItems(
    items: CartItem[],
    rule: AutoDiscountRule,
    productCategoryMap: ProductCategoryMap,
): CartItem[] {
    if (rule.applies_to === "ALL_PRODUCTS") {
        return items;
    }
    if (rule.applies_to === "SPECIFIC_PRODUCTS") {
        const targetSet = new Set(rule.target_product_ids);
        return items.filter(i => targetSet.has(i.productId));
    }
    // SPECIFIC_CATEGORIES
    const targetCatSet = new Set(rule.target_category_ids);
    return items.filter(i => {
        const cats = productCategoryMap[i.productId] ?? [];
        return cats.some(c => targetCatSet.has(c));
    });
}

/**
 * Applies the quantity_scope filter.
 * - ACROSS_TARGET: all eligible items collectively must reach min_quantity.
 * - PER_PRODUCT:   only items where the individual quantity meets min_quantity.
 */
function checkQuantityRequirement(
    eligible: CartItem[],
    rule: AutoDiscountRule,
): CartItem[] {
    if (rule.quantity_scope === "PER_PRODUCT") {
        // Sum all variant rows for the same productId (e.g. 1× Red + 1× Green
        // of the same shirt = 2 units), then keep rows whose product-level
        // total meets the minimum.
        const qtyByProduct: Record<string, number> = {};
        for (const i of eligible) {
            qtyByProduct[i.productId] = (qtyByProduct[i.productId] ?? 0) + i.quantity;
        }
        return eligible.filter(i => qtyByProduct[i.productId] >= rule.min_quantity);
    }
    // ACROSS_TARGET
    const totalQty = eligible.reduce((s, i) => s + i.quantity, 0);
    return totalQty >= rule.min_quantity ? eligible : [];
}

/** Calculates the raw discount amount for a set of qualifying items. */
function calculateRuleDiscount(items: CartItem[], rule: AutoDiscountRule): number {
    let subtotal: number;

    if (rule.quantity_scope === "PER_PRODUCT" && rule.min_quantity > 1) {
        // "N for price" deals: only discount complete groups of min_quantity items.
        // E.g. "2 for 150" with 3 items of the same product → discount 2 items, 1 at full price.
        // With 4 items → discount all 4 (two complete groups of 2).
        const qtyByProduct: Record<string, number> = {};
        for (const i of items) {
            qtyByProduct[i.productId] = (qtyByProduct[i.productId] ?? 0) + i.quantity;
        }
        subtotal = 0;
        for (const i of items) {
            const totalQty = qtyByProduct[i.productId];
            const discountableQty = Math.floor(totalQty / rule.min_quantity) * rule.min_quantity;
            // This variant's proportional share of the discountable quantity
            const proportional = (i.quantity / totalQty) * discountableQty;
            subtotal += i.price * proportional;
        }
    } else {
        subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    }

    if (subtotal <= 0) return 0;
    if (rule.discount_type === "PERCENTAGE") {
        return parseFloat((subtotal * (rule.discount_value / 100)).toFixed(2));
    }
    // FIXED
    return parseFloat(Math.min(rule.discount_value, subtotal).toFixed(2));
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Evaluates all active automatic discount rules against the cart.
 *
 * Algorithm (greedy, descending by discount value):
 * 1. For each rule: find eligible items → check quantity threshold → calculate discount.
 * 2. Sort qualifying rules highest-discount first.
 * 3. Assign items greedily: once a productId is claimed by a higher rule, a lower rule
 *    cannot claim the same product (prevents double-discounting).
 */
export function evaluateAutoDiscounts(
    cartItems: CartItem[],
    rules: AutoDiscountRule[],
    productCategoryMap: ProductCategoryMap,
): AutoDiscountResult {
    if (!cartItems.length || !rules.length) {
        return {
            totalAutoDiscount: 0,
            appliedRules: [],
            coveredProductIds: new Set(),
            label: "",
            nearMisses: [],
        };
    }

    // Step 1: score each rule
    type ScoredRule = { rule: AutoDiscountRule; qualifying: CartItem[]; discount: number };
    const scored: ScoredRule[] = [];

    for (const rule of rules) {
        const eligible = getEligibleItems(cartItems, rule, productCategoryMap);
        const qualifying = checkQuantityRequirement(eligible, rule);
        if (!qualifying.length) continue;

        // Optional: min_order_amount check (against cart subtotal)
        if (rule.min_order_amount != null) {
            const cartSubtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
            if (cartSubtotal < rule.min_order_amount) continue;
        }

        const discount = calculateRuleDiscount(qualifying, rule);
        if (discount > 0) {
            scored.push({ rule, qualifying, discount });
        }
    }

    // Step 2: sort descending by discount amount
    scored.sort((a, b) => b.discount - a.discount);

    // Step 3: greedy assignment — a productId can only be claimed once
    const claimedProductIds = new Set<string>();
    const appliedRules: AppliedRule[] = [];
    let totalAutoDiscount = 0;
    const allCoveredIds = new Set<string>();

    for (const { rule, qualifying, discount } of scored) {
        // Filter out items already claimed by a higher-value rule
        const unclaimed = qualifying.filter(i => !claimedProductIds.has(i.productId));
        if (!unclaimed.length) continue;

        // Recompute discount on unclaimed items only
        const actualDiscount = calculateRuleDiscount(unclaimed, rule);
        if (actualDiscount <= 0) continue;

        const coveredIds = unclaimed.map(i => i.productId);
        coveredIds.forEach(id => claimedProductIds.add(id));
        coveredIds.forEach(id => allCoveredIds.add(id));

        appliedRules.push({
            id: rule.id,
            title: rule.title,
            discountAmount: actualDiscount,
            coveredProductIds: coveredIds,
        });

        totalAutoDiscount = parseFloat((totalAutoDiscount + actualDiscount).toFixed(2));
    }

    const label = appliedRules.map(r => r.title).join(", ");

    // ── Near misses — rules with eligible items but not enough qty ──────────
    // `scored` only contains rules that MET the quantity threshold, so near misses
    // come from rules that are NOT in scored at all.
    const appliedIds = new Set(appliedRules.map(r => r.id));
    const scoredIds  = new Set(scored.map(s => s.rule.id));
    const nearMisses: NearMissRule[] = [];

    for (const rule of rules) {
        if (scoredIds.has(rule.id) || appliedIds.has(rule.id)) continue;
        const eligible = getEligibleItems(cartItems, rule, productCategoryMap);
        if (!eligible.length) continue; // no matching items at all — not a useful nudge

        // Use the actual product names already in the cart — no extra fetch needed.
        // e.g. "Tianna Top" or "Tianna Top, Lola Dress" for a big mixed cart.
        const targetLabel = eligible.map(i => i.name).join(", ") || "item";

        if (rule.quantity_scope === "ACROSS_TARGET") {
            const currentQty = eligible.reduce((s, i) => s + i.quantity, 0);
            if (currentQty > 0 && currentQty < rule.min_quantity) {
                nearMisses.push({
                    id: rule.id,
                    title: rule.title,
                    needed: rule.min_quantity - currentQty,
                    scope: "ACROSS_TARGET",
                    targetLabel,
                });
            }
        } else {
            // PER_PRODUCT — aggregate variants by productId before checking gap
            const qtyByProduct: Record<string, number> = {};
            for (const i of eligible) {
                qtyByProduct[i.productId] = (qtyByProduct[i.productId] ?? 0) + i.quantity;
            }
            const shortProducts = [...new Set(eligible.map(i => i.productId))]
                .filter(pid => qtyByProduct[pid] > 0 && qtyByProduct[pid] < rule.min_quantity);
            if (shortProducts.length > 0) {
                const minNeeded = Math.min(...shortProducts.map(pid => rule.min_quantity - qtyByProduct[pid]));
                nearMisses.push({
                    id: rule.id,
                    title: rule.title,
                    needed: minNeeded,
                    scope: "PER_PRODUCT",
                    targetLabel,
                });
            }
        }
    }

    return {
        totalAutoDiscount,
        appliedRules,
        coveredProductIds: allCoveredIds,
        label,
        nearMisses,
    };
}
