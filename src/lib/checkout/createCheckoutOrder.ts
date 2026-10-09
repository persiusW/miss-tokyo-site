// Order creation for every online channel: the storefront checkout
// (/api/paystack/initialize), and staff or WhatsApp orders via
// createCheckoutOrder(). One path, so stock holds, variant resolution, pricing
// and the Paystack webhook behave identically wherever an order starts.

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { reserveStock, releaseReservation, releaseSupersededAttempts, getStockStatus, ONLINE_HOLD_MINUTES, type ReserveItem } from "@/lib/inventory";
import { variantKey } from "@/lib/utils/normAttr";
import { validateDiscountCode, holdDiscount, type ValidatedDiscount } from "@/lib/discountValidation";
import { DELIVERY_DEFAULTS, parseDeliverySettings, parseZone, resolveDeliveryFee, zoneForRegion, zoneLabel } from "@/lib/delivery";
import { errorBody } from "@/lib/errors/catalogue";
import { channelFor, cleanSaleKey } from "@/lib/payments/attemptRules";
import { recordError, recordStart } from "@/lib/payments/attempts";

/** The JSON body /api/paystack/initialize has always accepted. */
export type CheckoutPayload = {
    productId?: any;
    email?: unknown;
    cartItems?: unknown;
    metadata?: any;
    previousOrderId?: unknown;
};

/** Server-computed money for an order, in GHS. */
export type OrderTotals = {
    /** Goods at catalogue price (sale and wholesale applied), before discounts. */
    subtotal: number;
    /** Automatic discounts, coupon or gift card, including any part spent on delivery. */
    discount: number;
    platformFee: number;
    /** Delivery actually payable, after any discount against it. */
    deliveryFee: number;
    total: number;
    itemCount: number;
    hasPreorderItems: boolean;
};

/** An HTTP status and JSON body, exactly as the route returns them. */
export type CheckoutRunResult = { status: number; body: any; totals?: OrderTotals };

/** Where an order came from. Stored on orders.source. */
export type CheckoutSource = "storefront" | "whatsapp" | "pos" | "dashboard";

export type CheckoutContext = {
    source: CheckoutSource;
    /** The signed-in shopper, if any. Only used to grant wholesale pricing. */
    authUserId: string | null;
    /** Stock hold length. Defaults to the storefront's ONLINE_HOLD_MINUTES. */
    holdMinutes?: number;
    /**
     * Release this email's earlier unpaid attempts first (the storefront retry
     * path). Off for staff and WhatsApp orders: they must never free the holds
     * of a checkout the same customer has open on the website.
     */
    supersede?: boolean;
    /** Stored on orders.notes. */
    notes?: string | null;
    /** Price and validate only: return totals before anything is written. */
    dryRun?: boolean;
};

export async function runCheckout(payload: CheckoutPayload, ctx: CheckoutContext): Promise<CheckoutRunResult> {
    const saleKey = cleanSaleKey((payload as { saleKey?: unknown } | null)?.saleKey);
    const attemptChannel = channelFor(ctx.source);
        const {
            productId,
            email: rawEmail,
            cartItems,
            metadata: clientMetadata,
            previousOrderId,
        } = payload;

        // Three callers reach this route and only the storefront checkout
        // validates the address it sends: /checkout/direct checks nothing but
        // emptiness, and dashboard Pay Links takes whatever staff typed. A
        // malformed address reaches Paystack and comes back as HTTP 400
        // "Invalid Email Address Passed", which cancels the order below.
        // Same shape as the storefront's own check, so nothing a customer can
        // already type through checkout is newly rejected.
        const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return { status: 400, body: { error: "A valid email address is required to process payment." } };
        }

        // Lower-casing is not cosmetic. This value is written to
        // orders.customer_email, and the orders RLS policy compares it with
        // auth.users.email, which Supabase always stores lower-cased. An order
        // saved as "Name@gmail.com" is invisible to its own owner's account.
        const emailForLog = `${email.slice(0, 3)}***@${email.split("@")[1] ?? ""}`;

        const cartArr: any[] = Array.isArray(cartItems) ? cartItems : [];

        // Quantities price the order, so each line must be a whole number of
        // units. A negative or fractional line on a pre-order — which skips the
        // stock checks below — used to lower the total.
        if (cartArr.some((i: any) => !Number.isInteger(i?.quantity) || i.quantity < 1 || i.quantity > 999)) {
            return { status: 400, body: { error: "Please check the quantities in your cart and try again." } };
        }

        // Hoisted — populated inside the cart block, returned in the success response
        const oosItems: string[] = [];

        // Hoisted — populated inside the cart block, used for hasPreorder check below
        let dbProductMap: Record<string, any> = {};

        // Calculate amount exclusively server-side — never trust client-supplied amounts
        let amountInGHS = 0;
        if (cartArr.length > 0 || productId) {
            // Priority 2: Recalculate Cart Total or Single Product server-side
            // Wholesale tiers go to a signed-in wholesale account on the
            // storefront only. They used to follow the typed email address, so
            // anyone who typed a wholesaler's (or an admin's) address was charged
            // tier prices. Staff and WhatsApp orders are always retail.
            let userProfile: { role: string | null } | null = null;
            if (ctx.source === "storefront" && ctx.authUserId) {
                const { data } = await supabaseAdmin
                    .from("profiles")
                    .select("role")
                    .eq("id", ctx.authUserId)
                    .maybeSingle();
                userProfile = data;
            }

            const isWholesaler = !!(userProfile?.role && ["admin", "owner", "wholesale", "wholesaler"].includes(userProfile.role.toLowerCase()));

            // Fetch wholesale tiers if wholesaler
            let tiers: any = null;
            if (isWholesaler) {
                const { data: tiersCopy } = await supabaseAdmin
                    .from("site_copy")
                    .select("value")
                    .eq("copy_key", "wholesale_tiers")
                    .maybeSingle();
                try {
                    tiers = tiersCopy?.value ? JSON.parse(tiersCopy.value) : {
                        tier1_min: 3, tier1_max: 5, tier1_discount: 10,
                        tier2_min: 6, tier2_max: 10, tier2_discount: 15,
                        tier3_min: 11, tier3_max: 999, tier3_discount: 20
                    };
                } catch { tiers = null; }
            }

            // Fetch prices from DB
            const pIds = cartArr.length > 0 ? cartArr.map(i => i.productId) : [productId];
            const { data: dbProducts } = await supabaseAdmin
                .from("products")
                .select("id, name, price_ghs, is_sale, discount_value, inventory_count, track_inventory, track_variant_inventory, is_active, preorder_enabled, category_id, category_ids, category_type")
                .in("id", pIds);

            // Build a product map for server-side is_active and preorder checks
            dbProductMap = Object.fromEntries((dbProducts ?? []).map((p: any) => [p.id, p]));

            // A line flagged isPreOrder skips every stock check and the
            // reservation, so the flag cannot be taken on the client's word. It
            // still records which button the customer pressed (Add to Cart vs
            // Pre-Order), so it is kept only where the catalogue allows it.
            const preorderEligible = await preorderEligibleIds(dbProducts ?? []);
            for (const item of cartArr) {
                if (item.isPreOrder === true && !preorderEligible.has(item.productId)) item.isPreOrder = false;
            }

            // Reject inactive products — client isPreOrder is untrusted
            for (const item of cartArr) {
                const p = dbProductMap[item.productId];
                if (!p?.is_active) {
                    return { status: 409, body: { error: `"${item.name}" is no longer available.` } };
                }
            }

            const dbPriceMap = (dbProducts || []).reduce((acc: any, p: any) => {
                const base = p.is_sale && p.discount_value > 0 ? p.price_ghs * (1 - p.discount_value / 100) : p.price_ghs;
                acc[p.id] = base;
                return acc;
            }, {});

            // Aggregate total ordered quantity per product across all cart items.
            // Buying 1×S + 1×M + 1×L of the same product = 3 units, not 1.
            // Preorder bypass is driven by which button the customer clicked at add-to-cart time:
            // isPreOrder=true → they clicked "Pre-Order", skip stock limits for that item.
            // isPreOrder=false/undefined → they clicked "Add to Cart", enforce stock normally.
            const qtyByProductId: Record<string, number> = {};
            for (const item of cartArr) {
                if (!item.productId) continue;
                if (item.isPreOrder) continue; // pre-order intent — no stock limit
                qtyByProductId[item.productId] = (qtyByProductId[item.productId] ?? 0) + (item.quantity ?? 1);
            }

            // Hard stock guard: reject if aggregate qty for any product exceeds inventory
            const dbStockMap = (dbProducts || []).reduce((acc: any, p: any) => {
                acc[p.id] = p.inventory_count ?? 0;
                return acc;
            }, {});
            const checkedProducts = new Set<string>();
            for (const item of cartArr) {
                if (item.isPreOrder) continue; // pre-order intent — no stock limit
                if (checkedProducts.has(item.productId)) continue;
                checkedProducts.add(item.productId);
                const stock = dbStockMap[item.productId];
                const totalQty = qtyByProductId[item.productId] ?? (item.quantity ?? 1);
                if (stock !== undefined && stock !== 9999 && totalQty > stock) {
                    return { status: 409, body: { error: `"${item.name}" only has ${stock} unit${stock === 1 ? "" : "s"} in stock.` } };
                }
            }

            // Variant-level guard: for track_variant_inventory products, also check each
            // individual variant's stock so a sold-out size can't slip through.
            const variantTrackedProductIds = new Set<string>(
                (dbProducts ?? []).filter((p: any) => p.track_variant_inventory).map((p: any) => p.id as string)
            );
            if (variantTrackedProductIds.size > 0) {
                const variantCartItems = cartArr.filter(i => {
                    if (!variantTrackedProductIds.has(i.productId)) return false;
                    return !i.isPreOrder; // skip if user clicked Pre-Order
                });
                if (variantCartItems.length > 0) {
                    const { data: dbVariants } = await supabaseAdmin
                        .from("product_variants")
                        .select("product_id, size, color, brand, inventory_count")
                        .in("product_id", [...variantTrackedProductIds]);

                    const variantStockMap: Record<string, number> = {};
                    for (const v of (dbVariants ?? [])) {
                        const key = variantKey(v.product_id, v);
                        variantStockMap[key] = v.inventory_count ?? 0;
                    }

                    for (const item of variantCartItems) {
                        const key = variantKey(item.productId, item);
                        const variantStock = variantStockMap[key];
                        if (variantStock !== undefined && variantStock !== 9999 && (item.quantity ?? 1) > variantStock) {
                            return { status: 409, body: { error: `"${item.name}" in this size/colour only has ${variantStock} unit${variantStock === 1 ? "" : "s"} in stock.` } };
                        }
                    }
                }
            }

            // OOS enforcement — uses dbProductMap (already fetched above, now includes track_inventory + name)
            const seenOosProducts = new Set<string>();
            for (const item of cartArr) {
                if (item.isPreOrder) continue; // pre-order intent — skip OOS block
                const p = dbProductMap[item.productId];
                const totalQty = qtyByProductId[item.productId] ?? (item.quantity ?? 1);
                if (p && p.track_inventory && (p.inventory_count ?? 0) < totalQty && !seenOosProducts.has(item.productId)) {
                    seenOosProducts.add(item.productId);
                    oosItems.push(p.name ?? item.name ?? item.productId);
                }
            }

            // If all products in cart are OOS, abort with 409
            const uniqueProductCount = new Set(cartArr.map((i: any) => i.productId).filter(Boolean)).size;
            if (oosItems.length > 0 && oosItems.length >= uniqueProductCount) {
                return { status: 409, body: { error: "All items in your cart are out of stock.", oosItems } };
            }

            const { resolveWholesalePrice } = await import("@/lib/wholesale");

            if (cartArr.length > 0) {
                amountInGHS = cartArr.reduce((acc, item) => {
                    const baseDbPrice = dbPriceMap[item.productId] || 0;
                    const unitPrice = (isWholesaler && tiers)
                        ? resolveWholesalePrice(item.quantity, baseDbPrice, tiers)
                        : baseDbPrice;
                    return acc + (unitPrice * item.quantity);
                }, 0);
            } else {
                const baseDbPrice = dbPriceMap[productId] || 0;
                amountInGHS = baseDbPrice;
            }
        }

        const goodsSubtotal = amountInGHS;

        // Apply automatic discounts server-side (re-evaluated independently of client)
        let autoDiscountAmount = 0;
        let autoDiscountLabel = "";
        let appliedAutoDiscountIds: string[] = [];
        // When every cart item is covered by auto discounts, manual coupons are blocked
        let couponBlocked = false;
        if (cartArr.length > 0) {
            const { evaluateAutoDiscounts } = await import("@/lib/autoDiscount");

            // Fetch active rules
            const { data: autoRules } = await supabaseAdmin
                .from("automatic_discounts")
                .select("id, title, discount_type, discount_value, applies_to, target_category_ids, target_product_ids, min_quantity, quantity_scope, min_order_amount")
                .eq("is_active", true)
                .lte("starts_at", new Date().toISOString())
                .or("ends_at.is.null,ends_at.gt." + new Date().toISOString());

            if (autoRules && autoRules.length > 0) {
                // Build productCategoryMap for category-scoped rules
                const hasCategoryRules = autoRules.some((r: any) => r.applies_to === "SPECIFIC_CATEGORIES");
                const productCategoryMap: Record<string, string[]> = {};

                if (hasCategoryRules) {
                    const cartProductIds = cartArr.map((i: any) => i.productId).filter(Boolean);
                    const { data: prods } = await supabaseAdmin
                        .from("products")
                        .select("id, category_ids")
                        .in("id", cartProductIds);
                    for (const p of prods ?? []) {
                        productCategoryMap[p.id] = Array.isArray(p.category_ids) ? p.category_ids : [];
                    }
                }

                const autoResult = evaluateAutoDiscounts(cartArr, autoRules as any, productCategoryMap);
                autoDiscountAmount = autoResult.totalAutoDiscount;
                autoDiscountLabel = autoResult.label;
                appliedAutoDiscountIds = autoResult.appliedRules.map(r => r.id);

                if (autoDiscountAmount > 0) {
                    amountInGHS = Math.max(0, parseFloat((amountInGHS - autoDiscountAmount).toFixed(2)));
                }

                // Coupon only applies to items NOT covered by auto discounts
                couponBlocked = cartArr.every(i => autoResult.coveredProductIds.has(i.productId));
            }
        }

        // Delivery is resolved BEFORE the discount, because a gift card or a
        // fixed coupon now spends against it. It used to be added afterwards,
        // which is precisely why nothing could ever reach it.
        // Own guarded select. Bolting these columns onto the platform-fee
        // query above would mean an unapplied migration takes the fee path
        // down with it; here a failure just yields the disabled defaults.
        let deliverySettings = DELIVERY_DEFAULTS;
        try {
            const { data: deliveryRow } = await supabaseAdmin
                .from("store_settings")
                .select("delivery_fees_enabled, delivery_fee_accra, delivery_fee_outside")
                .eq("id", "default")
                .maybeSingle();
            deliverySettings = parseDeliverySettings(deliveryRow);
        } catch (err) {
            console.warn("[Paystack init] delivery settings unavailable, charging no delivery fee:", err);
        }

        // The client sends a zone, but a tampered payload could claim the
        // cheaper one. Derive a zone from the region it also sent and charge
        // whichever costs more: a deliberate downgrade cannot underpay, while
        // a customer can still voluntarily pick the dearer Accra rate for an
        // address the region dropdown does not capture well.
        const claimedZone = parseZone(clientMetadata?.delivery_zone);
        const regionZone = zoneForRegion(clientMetadata?.region);
        const feeArgs = {
            settings: deliverySettings,
            country: clientMetadata?.country,
            deliveryMethod: clientMetadata?.deliveryMethod,
        };
        const claimedFee = resolveDeliveryFee({ ...feeArgs, zone: claimedZone });
        const regionFee = resolveDeliveryFee({ ...feeArgs, zone: regionZone });
        const deliveryFee = Math.max(claimedFee, regionFee);
        const deliveryZone: string | null =
            deliveryFee <= 0 ? null : (claimedFee >= regionFee ? claimedZone : regionZone);

        // Validate the discount code server-side — the client's discount_amount is
        // NEVER trusted; the code is re-checked against the DB and its value
        // recomputed against the server-calculated total.
        let validatedDiscount: ValidatedDiscount | null = null;
        if (clientMetadata?.discount_code && !couponBlocked) {
            validatedDiscount = await validateDiscountCode(clientMetadata.discount_code, amountInGHS, deliveryFee);
            const claimedAmount = Number(clientMetadata?.discount_amount) || 0;
            const serverAmount = validatedDiscount?.amount ?? 0;
            if (Math.abs(claimedAmount - serverAmount) > 0.02) {
                console.warn(`[Paystack init] discount mismatch for code "${clientMetadata.discount_code}": client claimed ${claimedAmount}, server computed ${serverAmount}. Using server value.`);
            }
            if (serverAmount > 0) {
                // Only the products portion comes off here. The delivery portion is
                // applied to the fee further down, so the platform fee keeps being
                // charged on goods alone.
                amountInGHS = Math.max(0, parseFloat((amountInGHS - (validatedDiscount?.subtotalAmount ?? 0)).toFixed(2)));
            }
        }
        const discountCode = validatedDiscount?.code ?? null;
        const discountAmount = validatedDiscount?.amount ?? 0;
        const discountTag = validatedDiscount?.type ?? null;

        // A discount covering the whole basket is a valid order, not a bad
        // calculation. This used to refuse it outright, so a gift card worth
        // more than the goods failed checkout with a raw-sounding error while
        // the till has always handled the same case. Delivery may still be
        // payable, so the real emptiness test comes after it is applied.
        if (amountInGHS < 0 || !Number.isFinite(amountInGHS)) {
            return { status: 400, body: { error: "We could not price this order. Please refresh and try again." } };
        }

        // Apply platform fee server-side — never trust client-supplied fee amounts
        const { data: storeFeeSettings } = await supabaseAdmin
            .from("store_settings")
            .select("platform_fee_percentage, platform_fee_label")
            .eq("id", "default")
            .maybeSingle();

        const feePct = Number(storeFeeSettings?.platform_fee_percentage) || 0;
        const platformFeeAmount = feePct > 0
            ? parseFloat((amountInGHS * feePct / 100).toFixed(2))
            : 0;
        const platformFeeLabel = storeFeeSettings?.platform_fee_label || (feePct > 0 ? `${feePct}%` : undefined);
        const amountWithFee = parseFloat((amountInGHS + platformFeeAmount).toFixed(2));

        // Whatever the code put against shipping comes off here, so a fixed
        // coupon or gift card larger than the basket spends its remainder on
        // delivery instead of discarding it, and free_shipping actually waives.
        const deliveryDiscount = Math.min(validatedDiscount?.deliveryAmount ?? 0, deliveryFee);
        const payableDelivery = parseFloat(Math.max(0, deliveryFee - deliveryDiscount).toFixed(2));
        const amountWithDelivery = parseFloat((amountWithFee + payableDelivery).toFixed(2));

        const totals: OrderTotals = {
            subtotal: parseFloat(goodsSubtotal.toFixed(2)),
            discount: parseFloat((goodsSubtotal - amountInGHS + deliveryDiscount).toFixed(2)),
            platformFee: platformFeeAmount,
            deliveryFee: payableDelivery,
            total: amountWithDelivery,
            itemCount: cartArr.length > 0
                ? cartArr.reduce((n: number, i: any) => n + (i.quantity ?? 1), 0)
                : (productId ? 1 : 0),
            hasPreorderItems: cartArr.some((i: any) => i.isPreOrder === true),
        };
        if (ctx.dryRun) {
            return { status: 200, body: { quote: true, oosItems }, totals };
        }

        if (amountWithDelivery <= 0) {
            return { status: 409, body: {
                error: "This order is fully covered. Please contact us to complete it — no payment is needed.",
            } };
        }

        const paystackSecret = process.env.PAYSTACK_SECRET_KEY || "";
        if (!paystackSecret) {
            return { status: 200, body: {
                authorizationUrl: "https://checkout.paystack.com/dummy",
                reference: "dummy-ref",
            }, totals };
        }

        // Use the cart-item flag — this covers both product-level and category-inherited preorder
        const hasPreorder = cartArr.some((item: any) => item.isPreOrder === true);
        // Mixed = has at least one preorder AND at least one regular (in-stock) item
        const isMixedOrder = hasPreorder && cartArr.some((item: any) => item.isPreOrder !== true);

        // Create a pending order BEFORE redirecting to Paystack.
        // This guarantees orders are always recorded, regardless of webhook/verify reliability.
        const { data: pendingOrder, error: orderError } = await supabaseAdmin
            .from("orders")
            .insert([{
                customer_email: email,
                customer_name: clientMetadata?.fullName || null,
                customer_phone: clientMetadata?.phone || null,
                shipping_address: clientMetadata?.address ? {
                    text: clientMetadata.address,
                    country: clientMetadata.country || null,
                    region: clientMetadata.region || null,
                } : null,
                delivery_method: clientMetadata?.deliveryMethod || "delivery",
                total_amount: amountWithDelivery,
                delivery_fee: deliveryFee,
                delivery_zone: deliveryFee > 0 ? deliveryZone : null,
                status: "pending",
                source: ctx.source,
                ...(ctx.notes ? { notes: ctx.notes } : {}),
                has_preorder: hasPreorder,
                is_mixed_order: isMixedOrder,
                items: cartArr,
                discount_code: discountCode,
                discount_amount: discountAmount,
                auto_discount_title: autoDiscountLabel || null,
                auto_discount_amount: autoDiscountAmount,
                customer_metadata: {
                    whatsapp: clientMetadata?.whatsapp || null,
                    instagram: clientMetadata?.instagram || null,
                    snapchat: clientMetadata?.snapchat || null,
                },
            }])
            .select("id")
            .single();

        if (orderError || !pendingOrder) {
            console.error("Failed to create pending order:", orderError);
            return { status: 500, body: { error: "Failed to record order. Payment not initiated." } };
        }

        const orderId = pendingOrder.id;

        const amountInPesewas = Math.round(amountWithDelivery * 100);
        const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://misstokyo.shop";
        const siteUrl = rawSiteUrl.replace(/\/+$/, "");

        // --- SPLIT GROUP (SPL_xxx) — only applied when amount is above Paystack's
        // minimum subaccount payout (~GHS 5). Below that, the 2.5% allocation
        // rounds to less than 1 pesewa and Paystack returns "No active channel".
        const paystackSplitCode = process.env.PAYSTACK_SPLIT_CODE;
        const splitPayload = (paystackSplitCode && amountWithDelivery >= 5) ? { split_code: paystackSplitCode } : {};

        // --- SUBACCOUNT (ACCT_xxx) — commented out while testing split groups ---
        // const paystackSubaccount = process.env.PAYSTACK_SUBACCOUNT;
        // const subPct = Number(process.env.PAYSTACK_SUBACCOUNT_PERCENTAGE) || 2.5;
        // const subaccountPayload = paystackSubaccount ? {
        //     subaccount: paystackSubaccount,
        //     bearer: "subaccount",
        //     transaction_charge: Math.round(amountInPesewas * ((100 - subPct) / 100)),
        // } : {};

        // A retry after an abandoned attempt must not be blocked by that
        // attempt's own hold. Released before reserving, never after — the new
        // reservation has to be able to take those units.
        if (ctx.supersede !== false) try {
            await releaseSupersededAttempts({
                email,
                currentOrderId: orderId,
                previousOrderId: typeof previousOrderId === "string" ? previousOrderId : null,
            });
        } catch (e) {
            // Non-fatal: worst case the customer hits the old "sold out" refusal.
            console.error("[checkout] could not release superseded attempts:", e);
        }

        // Atomically reserve stock before redirecting to Paystack.
        // Throws if any item is unavailable; cancels the pending order if so.
        if (cartArr.length > 0) {
            // Resolve current variant IDs from (product_id, size, color, stitching) so stale
            // cart UUIDs (from a product re-save) don't break the reservation.
            const variantIdLookup: Record<string, string> = {};
            const variantTrackedIds = new Set<string>(
                (Object.values(dbProductMap) as any[]).filter(p => p.track_variant_inventory).map(p => p.id as string)
            );
            if (variantTrackedIds.size > 0) {
                const { data: currentVariants } = await supabaseAdmin
                    .from("product_variants")
                    .select("id, product_id, size, color, brand")
                    .in("product_id", [...variantTrackedIds]);
                for (const v of currentVariants ?? []) {
                    const key = variantKey(v.product_id, v);
                    variantIdLookup[key] = v.id;
                }
            }

            // Aggregate by (productId, resolvedVariantId) — prevents duplicate-key errors when
            // multiple cart items share the same product+variant (e.g. variant_id=null for both sizes).
            const reserveMap = new Map<string, ReserveItem>();
            for (const item of cartArr) {
                // Pre-order items have no stock to lock — skip the reservation entirely.
                // This covers both product-level preorder_enabled AND category-inherited
                // preorder (where the product column is false but isPreOrder was set at
                // add-to-cart time). The DB function only checks the column, so passing
                // category-inherited items would cause a false "insufficient stock" throw.
                if (item.isPreOrder) continue;

                let resolvedVariantId: string | null = item.variantId ?? null;
                if (variantTrackedIds.has(item.productId)) {
                    const lookupKey = variantKey(item.productId, item);
                    resolvedVariantId = variantIdLookup[lookupKey] ?? null;
                }
                const mapKey = `${item.productId}|${resolvedVariantId ?? "null"}`;
                const existing = reserveMap.get(mapKey);
                if (existing) {
                    existing.quantity += item.quantity ?? 1;
                } else {
                    reserveMap.set(mapKey, {
                        productId: item.productId,
                        variantId: resolvedVariantId,
                        quantity: item.quantity ?? 1,
                    });
                }
            }
            const reserveItems: ReserveItem[] = [...reserveMap.values()];

            try {
                await reserveStock(orderId, reserveItems, ctx.holdMinutes ?? ONLINE_HOLD_MINUTES);
            } catch (err: any) {
                await supabaseAdmin.from("orders").update({ status: "cancelled" }).eq("id", orderId);

                // The DB raises: "Insufficient stock for product: <uuid> (available: N, requested: N)"
                // Parse it and substitute a human-readable message with the product name + size.
                let friendlyError = "One or more items are no longer available. Please update your cart and try again.";
                const uuidMatch = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i.exec(err.message ?? "");
                const availMatch = /available:\s*(\d+)/i.exec(err.message ?? "");
                // The reservation function now refuses a line it cannot tie to a
                // variant row rather than measuring it against the pooled product
                // roll-up. "Sold out" would be misleading — the option itself is
                // the problem — so say that, and never leak the raw message.
                const unresolvedVariant = /variant not recognised/i.test(err.message ?? "");
                if (uuidMatch) {
                    const pid = uuidMatch[1];
                    const productName = dbProductMap[pid]?.name;
                    const available = availMatch ? parseInt(availMatch[1]) : null;
                    const problemItem = cartArr.find((i: any) => i.productId === pid);
                    const sizeLabel = problemItem?.size ? ` in size ${problemItem.size}` : "";
                    if (productName && unresolvedVariant) {
                        console.error("[checkout] variant unresolved at reservation", {
                            productId: pid, size: problemItem?.size, color: problemItem?.color, brand: problemItem?.brand,
                        });
                        friendlyError = `The option you picked for "${productName}" is no longer available. Please choose another size or colour.`;
                    } else if (productName) {
                        if (available === 0) {
                            friendlyError = `"${productName}"${sizeLabel} just sold out. Please remove it from your cart.`;
                        } else if (available !== null) {
                            friendlyError = `"${productName}"${sizeLabel} only has ${available} unit${available === 1 ? "" : "s"} left. Please update your cart quantity.`;
                        } else {
                            friendlyError = `"${productName}"${sizeLabel} doesn't have enough stock. Please update your cart.`;
                        }
                    }
                }

                return { status: 409, body: { error: friendlyError } };
            }
        } else if (productId && dbProductMap[productId]) {
            // Single-product path: no cartItems array supplied. Reserve product-level
            // stock so two concurrent buyers can't both claim the last unit.
            // Skip for untracked inventory (9999 sentinel) and pre-orders.
            const singleProduct = dbProductMap[productId];
            if (singleProduct.track_inventory !== false && !singleProduct.preorder_enabled) {
                try {
                    await reserveStock(orderId, [{ productId, variantId: null, quantity: 1 }], ctx.holdMinutes ?? ONLINE_HOLD_MINUTES);
                } catch (err: any) {
                    await supabaseAdmin.from("orders").update({ status: "cancelled" }).eq("id", orderId);
                    const availMatch = /available:\s*(\d+)/i.exec(err.message ?? "");
                    const available = availMatch ? parseInt(availMatch[1]) : null;
                    const name = singleProduct.name ?? "This item";
                    const friendlyError = available === 0
                        ? `"${name}" just sold out.`
                        : available !== null
                        ? `"${name}" only has ${available} unit${available === 1 ? "" : "s"} left.`
                        : `"${name}" is no longer available.`;
                    return { status: 409, body: { error: friendlyError } };
                }
            }
        }

        // Hold the discount alongside the stock, for the same 30-minute window
        // the online reservation uses. Without this, two customers can both be
        // quoted the same gift-card value and only one can be funded.
        if (validatedDiscount && validatedDiscount.amount > 0) {
            const held = await holdDiscount(validatedDiscount, { orderId }, 30);
            if (!held) {
                await supabaseAdmin.from("orders").update({ status: "cancelled" }).eq("id", orderId);
                await releaseReservation(orderId);
                return { status: 409, body: {
                    error: `"${validatedDiscount.code}" has just been used and no longer covers this order. Remove it and try again.`,
                } };
            }
        }

        let response: Response;
        try {
        response = await fetch("https://api.paystack.co/transaction/initialize", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${paystackSecret}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email,
                amount: amountInPesewas,
                currency: "GHS",
                callback_url: `${siteUrl}/checkout/success`,
                // GHS supports mobile money, card and bank transfer. "bank"
            // (direct debit) and "ussd" are Nigeria-only, and offering a
            // channel Paystack cannot render for this currency left the
            // checkout pane blank next to the channel list — a payment page
            // that looks broken, which is where dropped orders come from.
            // Mobile money leads, so it is the channel selected by default.
            channels: ["mobile_money", "card", "bank_transfer"],
                ...splitPayload,
                metadata: {
                    ...clientMetadata,
                    productId,
                    orderId,
                    // cartItems intentionally omitted — already stored in orders.items in DB.
                    // Sending large carts as metadata payload hits Paystack's size limit.
                    // Override client-supplied fee values with server-calculated ones
                    platform_fee_amount: platformFeeAmount > 0 ? platformFeeAmount : undefined,
                    platform_fee_label: platformFeeLabel,
                    delivery_fee: deliveryFee > 0 ? deliveryFee : undefined,
                    delivery_zone: deliveryFee > 0 ? deliveryZone ?? undefined : undefined,
                    delivery_label: deliveryFee > 0 ? zoneLabel(deliveryZone) : undefined,
                    // Override client-supplied discount fields with server-validated values —
                    // the webhook settles gift cards/coupons from these
                    discount_code: discountCode ?? undefined,
                    discount_amount: discountAmount > 0 ? discountAmount : undefined,
                    discount_tag: discountTag ?? undefined,
                    // Auto discount IDs for usage tracking in webhook
                    ...(appliedAutoDiscountIds.length > 0 ? {
                        auto_discount_ids: appliedAutoDiscountIds,
                    } : {}),
                },
            }),
        });
        } catch (e) {
            console.error("[Paystack init] unreachable:", e);
            await recordError({ saleKey, channel: attemptChannel, code: "PAY-01", message: String(e), orderId });
            if (orderId) {
                await supabaseAdmin.from("orders").update({ status: "cancelled" }).eq("id", orderId);
            }
            return { status: 502, body: { ...errorBody("PAY-01", "customer"), code: "gateway" } };
        }

        if (!response.ok) {
            const errText = await response.text();
            // Sanitised context alongside Paystack's own body — enough to tell
            // which request failed without putting an address in the logs.
            console.error(
                `[Paystack init] HTTP ${response.status}: ${errText} — email=${emailForLog} amount=${amountInPesewas}`,
            );
            await recordError({ saleKey, channel: attemptChannel, code: "PAY-01", message: `HTTP ${response.status}`, orderId });
            if (orderId) {
                await supabaseAdmin.from("orders").update({ status: "cancelled" }).eq("id", orderId);
            }
            return { status: 502, body: { ...errorBody("PAY-01", "customer"), code: "gateway" } };
        }

        const data = await response.json();

        if (data.status) {
            // Save the Paystack reference back to the pending order
            if (orderId && data.data?.reference) {
                await supabaseAdmin
                    .from("orders")
                    .update({ paystack_reference: data.data.reference })
                    .eq("id", orderId);
            }

            await recordStart({ saleKey, channel: attemptChannel, reference: data.data?.reference ?? null, amount: amountInPesewas / 100, orderId, userId: ctx.authUserId });
            return { status: 200, body: {
                authorizationUrl: data.data.authorization_url,
                reference: data.data.reference,
                orderId,
                oosItems: oosItems ?? [],
            }, totals };
        } else {
            // Paystack init failed — mark pending order as cancelled
            if (orderId) {
                await supabaseAdmin.from("orders").update({ status: "cancelled" }).eq("id", orderId);
            }
            console.error("[Paystack init] refused:", data?.message);
            await recordError({ saleKey, channel: attemptChannel, code: "PAY-02", message: data?.message, orderId });
            return { status: 400, body: { ...errorBody("PAY-02", "customer"), code: "refused" } };
        }
}

/**
 * Products that take pre-orders: their own flag, or any category they belong
 * to that has pre-orders enabled. The same inheritance the storefront uses to
 * show the Pre-Order button (getProducts in @/lib/products).
 */
export async function preorderEligibleIds(products: any[]): Promise<Set<string>> {
    const eligible = new Set<string>();
    if (products.length === 0) return eligible;
    const { data: cats } = await supabaseAdmin
        .from("categories")
        .select("id, name")
        .eq("preorder_enabled", true);
    const catIds = new Set((cats ?? []).map((c: any) => c.id as string));
    const catNames = new Set((cats ?? []).map((c: any) => String(c.name ?? "").toLowerCase()));
    for (const p of products) {
        if (
            p.preorder_enabled === true
            || (Array.isArray(p.category_ids) && p.category_ids.some((id: string) => catIds.has(id)))
            || (p.category_id && catIds.has(p.category_id))
            || (p.category_type && catNames.has(String(p.category_type).toLowerCase()))
        ) eligible.add(p.id);
    }
    return eligible;
}

// ─── Typed entry point for staff and WhatsApp orders ─────────────────────────

/**
 * Stand-in address for customers with no email. Paystack requires one, and
 * the order flow keys several lookups on it. The domain must be registered to
 * Miss Tokyo before go-live: whoever controls it receives these receipts.
 */
export const PLACEHOLDER_EMAIL_DOMAIN = "misstokyo.store";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type CreateCheckoutOrderInput = {
    items: Array<{
        product_id: string;
        /** Optional; the size/colour/brand below are what resolve the variant. */
        variant_id?: string | null;
        size?: string | null;
        colour?: string | null;
        brand?: string | null;
        quantity: number; // whole number >= 1
    }>;
    customer: {
        name: string;
        phone: string;
        email?: string | null; // {phone}@misstokyo.store when the customer has none
    };
    delivery: {
        method: "delivery" | "pickup";
        address?: string | null;
        /** The storefront's zones: Greater Accra, or anywhere else in Ghana. */
        zone?: "accra" | "outside" | null;
        region?: string | null;
    };
    source: "web" | "whatsapp" | "pos" | "dashboard";
    notes?: string | null;
    discount_code?: string | null;
    hold_minutes?: number;
};

export type CreateCheckoutOrderResult =
    | { success: true; orderId: string; authorizationUrl: string; paystackReference: string; totals: OrderTotals }
    | { success: false; error: string; code: string };

export type QuoteCheckoutOrderResult =
    | { success: true; totals: OrderTotals; outOfStock: string[] }
    | { success: false; error: string; code: string };

const fail = (code: string, error: string) => ({ success: false as const, code, error });

/** Ghana numbers as 233 + the last 9 digits, whatever form they were typed in. */
export function normaliseGhanaPhone(phone: string): string | null {
    const digits = (phone ?? "").replace(/\D/g, "");
    if (digits.length < 9) return null;
    return `233${digits.slice(-9)}`;
}

function codeForStatus(status: number, body?: any): string {
    if (status === 400 && body?.code === "refused") return "refused";
    if (status === 400) return "invalid";
    if (status === 409) return "unavailable";
    if (status === 502) return "gateway";
    return "internal";
}

/**
 * Turns the typed input into the storefront's own payload, so pricing, stock
 * and Paystack run through runCheckout() unchanged. Names, prices and the
 * pre-order flag come from the database, never from the caller.
 */
async function buildRun(input: CreateCheckoutOrderInput, dryRun: boolean): Promise<
    { ok: true; run: CheckoutRunResult } | { ok: false; error: ReturnType<typeof fail> }
> {
    const items = Array.isArray(input?.items) ? input.items : [];
    if (items.length === 0 || items.length > 50) return { ok: false, error: fail("invalid", "Add between 1 and 50 items.") };
    for (const it of items) {
        if (!UUID_RE.test(String(it?.product_id ?? ""))) return { ok: false, error: fail("invalid", "One of the products could not be identified.") };
        if (!Number.isInteger(it.quantity) || it.quantity < 1 || it.quantity > 999) return { ok: false, error: fail("invalid", "Quantities must be whole numbers of 1 or more.") };
        if (it.variant_id && !UUID_RE.test(it.variant_id)) return { ok: false, error: fail("invalid", "One of the options could not be identified.") };
    }

    const name = String(input?.customer?.name ?? "").trim().slice(0, 120);
    if (!name) return { ok: false, error: fail("invalid", "The customer's name is required.") };
    const phone = normaliseGhanaPhone(String(input?.customer?.phone ?? ""));
    if (!phone) return { ok: false, error: fail("invalid", "A valid phone number is required.") };
    const typedEmail = String(input?.customer?.email ?? "").trim().toLowerCase();
    const email = EMAIL_RE.test(typedEmail) ? typedEmail : `${phone}@${PLACEHOLDER_EMAIL_DOMAIN}`;

    const method = input?.delivery?.method === "pickup" ? "pickup" : "delivery";
    const address = String(input?.delivery?.address ?? "").trim().slice(0, 500);
    const zone = input?.delivery?.zone === "accra" || input?.delivery?.zone === "outside" ? input.delivery.zone : null;
    if (method === "delivery" && (!address || !zone)) {
        return { ok: false, error: fail("invalid", "Delivery needs an address and a zone (within Accra or outside Accra).") };
    }
    const region = String(input?.delivery?.region ?? "").trim() || (zone === "accra" ? "Greater Accra" : "");

    // A variant id fills in the options it stands for, so a caller holding
    // only the id still resolves the same variant the storefront would.
    const variantIds = items.map(i => i.variant_id).filter(Boolean) as string[];
    const variantMap = new Map<string, any>();
    if (variantIds.length > 0) {
        const { data: vRows } = await supabaseAdmin
            .from("product_variants")
            .select("id, product_id, size, color, brand")
            .in("id", variantIds);
        for (const v of vRows ?? []) variantMap.set(v.id, v);
    }

    const productIds = [...new Set(items.map(i => i.product_id))];
    const { data: products } = await supabaseAdmin
        .from("products")
        .select("id, name, slug, price_ghs, is_sale, discount_value, image_urls, preorder_enabled, category_id, category_ids, category_type")
        .in("id", productIds);
    const productMap = new Map((products ?? []).map((p: any) => [p.id, p]));
    if (productMap.size !== productIds.length) return { ok: false, error: fail("unavailable", "One of the products is no longer in the catalogue.") };

    const lines = items.map(it => {
        const v = it.variant_id ? variantMap.get(it.variant_id) : null;
        if (v && v.product_id !== it.product_id) return null;
        return {
            productId: it.product_id,
            size: (it.size ?? v?.size ?? "") || "",
            color: (it.colour ?? v?.color ?? undefined) || undefined,
            brand: (it.brand ?? v?.brand ?? undefined) || undefined,
            quantity: it.quantity,
        };
    });
    if (lines.some(l => l === null)) return { ok: false, error: fail("invalid", "An option does not belong to its product.") };

    // A line is a pre-order only when the catalogue takes pre-orders for it AND
    // live stock cannot cover it. In stock, it is reserved like any other sale.
    const eligible = await preorderEligibleIds(products ?? []);
    const stock = await getStockStatus(lines.map(l => ({ ...l!, variantId: null })));

    const cartItems = lines.map((l, idx) => {
        const p = productMap.get(l!.productId) as any;
        const unit = p.is_sale && p.discount_value > 0 ? p.price_ghs * (1 - p.discount_value / 100) : p.price_ghs;
        return {
            id: [l!.productId, l!.size, l!.color ?? "", l!.brand ?? ""].join("-"),
            productId: l!.productId,
            name: p.name,
            slug: p.slug,
            price: parseFloat(Number(unit).toFixed(2)),
            size: l!.size,
            ...(l!.color ? { color: l!.color } : {}),
            ...(l!.brand ? { brand: l!.brand } : {}),
            quantity: l!.quantity,
            imageUrl: Array.isArray(p.image_urls) ? p.image_urls[0] ?? "" : "",
            isPreOrder: eligible.has(l!.productId) && (stock[idx]?.available ?? 0) < l!.quantity,
        };
    });

    const source: CheckoutSource = input.source === "web" ? "storefront" : input.source;
    const defaultHold = input.source === "web" ? ONLINE_HOLD_MINUTES : 15;
    const holdMinutes = Number.isInteger(input.hold_minutes) && input.hold_minutes! >= 1 && input.hold_minutes! <= 120
        ? input.hold_minutes!
        : defaultHold;

    const run = await runCheckout(
        {
            email,
            cartItems,
            metadata: {
                fullName: name,
                phone,
                address: method === "delivery" ? address : "",
                country: "Ghana",
                region,
                deliveryMethod: method,
                delivery_zone: zone ?? undefined,
                ...(input.source === "whatsapp" ? { whatsapp: phone } : {}),
                ...(input.discount_code ? { discount_code: String(input.discount_code).trim() } : {}),
            },
        },
        {
            source,
            authUserId: null,
            holdMinutes,
            supersede: false,
            notes: input.notes ? String(input.notes).slice(0, 1000) : null,
            dryRun,
        },
    );
    return { ok: true, run };
}

/** Prices an order exactly as checkout would, without writing anything. */
export async function quoteCheckoutOrder(input: CreateCheckoutOrderInput): Promise<QuoteCheckoutOrderResult> {
    try {
        const built = await buildRun(input, true);
        if (!built.ok) return built.error;
        const { status, body, totals } = built.run;
        if (status === 200 && totals) return { success: true, totals, outOfStock: body?.oosItems ?? [] };
        return fail(codeForStatus(status, body), body?.error ?? "This order could not be priced.");
    } catch (e) {
        console.error("[quoteCheckoutOrder]", e);
        return fail("internal", "This order could not be priced. Please try again.");
    }
}

/**
 * Creates a pending order, holds its stock and returns a Paystack payment
 * link — the same path the storefront checkout takes, so the webhook settles
 * it identically.
 */
export async function createCheckoutOrder(input: CreateCheckoutOrderInput): Promise<CreateCheckoutOrderResult> {
    try {
        const built = await buildRun(input, false);
        if (!built.ok) return built.error;
        const { status, body, totals } = built.run;
        if (status === 200 && body?.reference === "dummy-ref") {
            return fail("payments_unconfigured", "Online payments are not set up on this server.");
        }
        if (status === 200 && body?.authorizationUrl && body?.orderId && totals) {
            return {
                success: true,
                orderId: body.orderId,
                authorizationUrl: body.authorizationUrl,
                paystackReference: body.reference,
                totals,
            };
        }
        return fail(codeForStatus(status, body), body?.error ?? "The order could not be created.");
    } catch (e) {
        console.error("[createCheckoutOrder]", e);
        return fail("internal", "The order could not be created. Please try again.");
    }
}
