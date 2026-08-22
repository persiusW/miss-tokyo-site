// How a discount code's value is divided between the goods and the delivery fee.
//
// Pure and dependency-free on purpose: the server charge path
// (lib/discountValidation), the preview endpoint (/api/checkout/validate-code)
// and the checkout page all import this same function. Each used to carry its
// own copy of the rules, which is exactly how they drifted — `free_shipping`
// computed a discount of zero in two separate places while both labelled the
// line "Free Shipping" and charged the fee in full.

export type DiscountSplit = {
    /** Total GHS to subtract — the two portions below added together. */
    amount: number;
    /** Portion off the products. The platform fee is charged on what remains. */
    subtotalAmount: number;
    /** Portion off the delivery fee. */
    deliveryAmount: number;
};

const ZERO: DiscountSplit = { amount: 0, subtotalAmount: 0, deliveryAmount: 0 };

const round = (n: number) => parseFloat(n.toFixed(2));

/** Goods first, then whatever is left falls onto delivery. */
function spill(value: number, subtotal: number, deliveryFee: number): DiscountSplit {
    const subtotalAmount = round(Math.min(Math.max(0, value), Math.max(0, subtotal)));
    const deliveryAmount = round(Math.min(Math.max(0, value) - subtotalAmount, Math.max(0, deliveryFee)));
    return { subtotalAmount, deliveryAmount, amount: round(subtotalAmount + deliveryAmount) };
}

/**
 * The single rule for what a code is worth against a given basket.
 *
 * Delivery used to be added *after* the discount was subtracted, so nothing
 * could ever reach it: a GHS 100 gift card on a GHS 80 basket with GHS 20
 * delivery covered the 80, left the customer paying the 20, and discarded the
 * remaining 20 of card value.
 *
 *   percentage    — products only. "20% off" must not quietly discount shipping.
 *   fixed         — products first, remainder spills onto delivery.
 *   gift_card     — same as fixed; stored value should spend in full.
 *   free_shipping — delivery only, exactly the fee.
 *   bogo          — nothing here; settled by hand at dispatch.
 */
export function computeDiscountSplit(args: {
    discountType: string;
    /** Percent for `percentage`; a GHS amount for every other type. */
    value: number;
    subtotal: number;
    deliveryFee: number;
}): DiscountSplit {
    const { discountType, subtotal, deliveryFee } = args;
    const value = Number(args.value) || 0;

    switch (discountType) {
        case "percentage": {
            const off = round((Math.max(0, subtotal) * value) / 100);
            return spill(off, subtotal, 0);
        }
        case "fixed":
        case "gift_card":
            return spill(value, subtotal, deliveryFee);
        case "free_shipping": {
            const fee = round(Math.max(0, deliveryFee));
            return { amount: fee, subtotalAmount: 0, deliveryAmount: fee };
        }
        default:
            // bogo, and anything a future admin screen invents.
            return ZERO;
    }
}
