export const maxDuration = 30; // 30 seconds — headroom for Paystack API handshake

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { reserveStock, releaseReservation, type ReserveItem } from "@/lib/inventory";
import { normAttr } from "@/lib/utils/normAttr";
import { validateDiscountCode, holdDiscount, type ValidatedDiscount } from "@/lib/discountValidation";
import { DELIVERY_DEFAULTS, parseDeliverySettings, parseZone, resolveDeliveryFee, zoneForRegion, zoneLabel } from "@/lib/delivery";

export async function POST(request: Request) {
    try {
        const {
            productId,
            email: rawEmail,
            cartItems,
            metadata: clientMetadata,
        } = await request.json();

        // Three callers reach this route and only the storefront checkout
        // validates the address it sends: /checkout/direct checks nothing but
        // emptiness, and dashboard Pay Links takes whatever staff typed. A
        // malformed address reaches Paystack and comes back as HTTP 400
        // "Invalid Email Address Passed", which cancels the order below.
        // Same shape as the storefront's own check, so nothing a customer can
        // already type through checkout is newly rejected.
        const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json(
                { error: "A valid email address is required to process payment." },
                { status: 400 },
            );
        }

        // Lower-casing is not cosmetic. This value is written to
        // orders.customer_email, and the orders RLS policy compares it with
        // auth.users.email, which Supabase always stores lower-cased. An order
        // saved as "Name@gmail.com" is invisible to its own owner's account.
        const emailForLog = `${email.slice(0, 3)}***@${email.split("@")[1] ?? ""}`;

        const cartArr: any[] = Array.isArray(cartItems) ? cartItems : [];

        // Hoisted — populated inside the cart block, returned in the success response
        const oosItems: string[] = [];

        // Hoisted — populated inside the cart block, used for hasPreorder check below
        let dbProductMap: Record<string, any> = {};

        // Calculate amount exclusively server-side — never trust client-supplied amounts
        let amountInGHS = 0;
        if (cartArr.length > 0 || productId) {
            // Priority 2: Recalculate Cart Total or Single Product server-side
            // Case-insensitive on purpose. The incoming address is now
            // lower-cased, but profiles rows written before that still carry
            // whatever was typed — an exact match would miss a wholesaler
            // stored as "Name@x.com" and quietly charge them retail.
            // ilike treats _ and % as wildcards, so the row is confirmed in JS
            // rather than trusted from the pattern alone.
            const { data: profileMatches } = await supabaseAdmin
                .from("profiles")
                .select("role, email")
                .ilike("email", email)
                .limit(5);
            const userProfile = (profileMatches ?? []).find(
                (p: any) => (p.email ?? "").toLowerCase() === email,
            );

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
                .select("id, name, price_ghs, is_sale, discount_value, inventory_count, track_inventory, track_variant_inventory, is_active, preorder_enabled")
                .in("id", pIds);

            // Build a product map for server-side is_active and preorder checks
            dbProductMap = Object.fromEntries((dbProducts ?? []).map((p: any) => [p.id, p]));

            // Reject inactive products — client isPreOrder is untrusted
            for (const item of cartArr) {
                const p = dbProductMap[item.productId];
                if (!p?.is_active) {
                    return NextResponse.json(
                        { error: `"${item.name}" is no longer available.` },
                        { status: 409 }
                    );
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
                    return NextResponse.json(
                        { error: `"${item.name}" only has ${stock} unit${stock === 1 ? "" : "s"} in stock.` },
                        { status: 409 }
                    );
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
                        const key = `${v.product_id}|${normAttr(v.size)}|${normAttr(v.color)}|${normAttr(v.brand)}`;
                        variantStockMap[key] = v.inventory_count ?? 0;
                    }

                    for (const item of variantCartItems) {
                        const key = `${item.productId}|${normAttr(item.size)}|${normAttr(item.color)}|${normAttr(item.brand)}`;
                        const variantStock = variantStockMap[key];
                        if (variantStock !== undefined && variantStock !== 9999 && (item.quantity ?? 1) > variantStock) {
                            return NextResponse.json(
                                { error: `"${item.name}" in this size/colour only has ${variantStock} unit${variantStock === 1 ? "" : "s"} in stock.` },
                                { status: 409 }
                            );
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
                return NextResponse.json(
                    { error: "All items in your cart are out of stock.", oosItems },
                    { status: 409 }
                );
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

        // Validate the discount code server-side — the client's discount_amount is
        // NEVER trusted; the code is re-checked against the DB and its value
        // recomputed against the server-calculated total.
        let validatedDiscount: ValidatedDiscount | null = null;
        if (clientMetadata?.discount_code && !couponBlocked) {
            validatedDiscount = await validateDiscountCode(clientMetadata.discount_code, amountInGHS);
            const claimedAmount = Number(clientMetadata?.discount_amount) || 0;
            const serverAmount = validatedDiscount?.amount ?? 0;
            if (Math.abs(claimedAmount - serverAmount) > 0.02) {
                console.warn(`[Paystack init] discount mismatch for code "${clientMetadata.discount_code}": client claimed ${claimedAmount}, server computed ${serverAmount}. Using server value.`);
            }
            if (serverAmount > 0) {
                amountInGHS = Math.max(0, parseFloat((amountInGHS - serverAmount).toFixed(2)));
            }
        }
        const discountCode = validatedDiscount?.code ?? null;
        const discountAmount = validatedDiscount?.amount ?? 0;
        const discountTag = validatedDiscount?.type ?? null;

        if (amountInGHS <= 0) {
            return NextResponse.json({ error: "Invalid amount calculation" }, { status: 400 });
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
        const amountWithDelivery = parseFloat((amountWithFee + deliveryFee).toFixed(2));

        const paystackSecret = process.env.PAYSTACK_SECRET_KEY || "";
        if (!paystackSecret) {
            return NextResponse.json({
                authorizationUrl: "https://checkout.paystack.com/dummy",
                reference: "dummy-ref",
            });
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
            return NextResponse.json({ error: "Failed to record order. Payment not initiated." }, { status: 500 });
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
                    const key = `${v.product_id}|${normAttr(v.size)}|${normAttr(v.color)}|${normAttr(v.brand)}`;
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
                    const lookupKey = `${item.productId}|${normAttr(item.size)}|${normAttr(item.color)}|${normAttr(item.brand)}`;
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
                await reserveStock(orderId, reserveItems);
            } catch (err: any) {
                await supabaseAdmin.from("orders").update({ status: "cancelled" }).eq("id", orderId);

                // The DB raises: "Insufficient stock for product: <uuid> (available: N, requested: N)"
                // Parse it and substitute a human-readable message with the product name + size.
                let friendlyError = "One or more items are no longer available. Please update your cart and try again.";
                const uuidMatch = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i.exec(err.message ?? "");
                const availMatch = /available:\s*(\d+)/i.exec(err.message ?? "");
                if (uuidMatch) {
                    const pid = uuidMatch[1];
                    const productName = dbProductMap[pid]?.name;
                    const available = availMatch ? parseInt(availMatch[1]) : null;
                    const problemItem = cartArr.find((i: any) => i.productId === pid);
                    const sizeLabel = problemItem?.size ? ` in size ${problemItem.size}` : "";
                    if (productName) {
                        if (available === 0) {
                            friendlyError = `"${productName}"${sizeLabel} just sold out. Please remove it from your cart.`;
                        } else if (available !== null) {
                            friendlyError = `"${productName}"${sizeLabel} only has ${available} unit${available === 1 ? "" : "s"} left. Please update your cart quantity.`;
                        } else {
                            friendlyError = `"${productName}"${sizeLabel} doesn't have enough stock. Please update your cart.`;
                        }
                    }
                }

                return NextResponse.json({ error: friendlyError }, { status: 409 });
            }
        } else if (productId && dbProductMap[productId]) {
            // Single-product path: no cartItems array supplied. Reserve product-level
            // stock so two concurrent buyers can't both claim the last unit.
            // Skip for untracked inventory (9999 sentinel) and pre-orders.
            const singleProduct = dbProductMap[productId];
            if (singleProduct.track_inventory !== false && !singleProduct.preorder_enabled) {
                try {
                    await reserveStock(orderId, [{ productId, variantId: null, quantity: 1 }]);
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
                    return NextResponse.json({ error: friendlyError }, { status: 409 });
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
                return NextResponse.json({
                    error: `"${validatedDiscount.code}" has just been used and no longer covers this order. Remove it and try again.`,
                }, { status: 409 });
            }
        }

        const response = await fetch("https://api.paystack.co/transaction/initialize", {
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

        if (!response.ok) {
            const errText = await response.text();
            // Sanitised context alongside Paystack's own body — enough to tell
            // which request failed without putting an address in the logs.
            console.error(
                `[Paystack init] HTTP ${response.status}: ${errText} — email=${emailForLog} amount=${amountInPesewas}`,
            );
            if (orderId) {
                await supabaseAdmin.from("orders").update({ status: "cancelled" }).eq("id", orderId);
            }
            return NextResponse.json({ error: "Payment gateway error. Please try again." }, { status: 502 });
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

            return NextResponse.json({
                authorizationUrl: data.data.authorization_url,
                reference: data.data.reference,
                orderId,
                oosItems: oosItems ?? [],
            });
        } else {
            // Paystack init failed — mark pending order as cancelled
            if (orderId) {
                await supabaseAdmin.from("orders").update({ status: "cancelled" }).eq("id", orderId);
            }
            return NextResponse.json({ error: data.message }, { status: 400 });
        }
    } catch (error) {
        console.error("Paystack Init Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
