export const maxDuration = 30; // 30 seconds — headroom for Paystack API handshake

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
    try {
        const {
            productId,
            email,
            cartItems,
            metadata: clientMetadata,
        } = await request.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        const cartArr: any[] = Array.isArray(cartItems) ? cartItems : [];

        // Calculate amount exclusively server-side — never trust client-supplied amounts
        let amountInGHS = 0;
        if (cartArr.length > 0 || productId) {
            // Priority 2: Recalculate Cart Total or Single Product server-side
            const { data: userProfile } = await supabaseAdmin
                .from("profiles")
                .select("role")
                .eq("email", email)
                .maybeSingle();

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
                .select("id, price_ghs, is_sale, discount_value, inventory_count")
                .in("id", pIds);

            const dbPriceMap = (dbProducts || []).reduce((acc: any, p: any) => {
                const base = p.is_sale && p.discount_value > 0 ? p.price_ghs * (1 - p.discount_value / 100) : p.price_ghs;
                acc[p.id] = base;
                return acc;
            }, {});

            // Inventory guard — reject order if any item exceeds available stock
            const dbStockMap = (dbProducts || []).reduce((acc: any, p: any) => {
                acc[p.id] = p.inventory_count ?? 0;
                return acc;
            }, {});
            for (const item of cartArr) {
                const stock = dbStockMap[item.productId];
                if (stock !== undefined && stock !== 9999 && item.quantity > stock) {
                    return NextResponse.json(
                        { error: `"${item.name}" only has ${stock} unit${stock === 1 ? "" : "s"} in stock.` },
                        { status: 409 }
                    );
                }
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
                let productCategoryMap: Record<string, string[]> = {};

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
                const allCovered = cartArr.every(i => autoResult.coveredProductIds.has(i.productId));
                if (allCovered) {
                    // Block coupon when everything is auto-discounted
                } else {
                    const discountAmount = Number(clientMetadata?.discount_amount) || 0;
                    if (discountAmount > 0) {
                        amountInGHS = Math.max(0, parseFloat((amountInGHS - discountAmount).toFixed(2)));
                    }
                }
            } else {
                // No auto discount rules — apply manual coupon normally
                const discountAmount = Number(clientMetadata?.discount_amount) || 0;
                if (discountAmount > 0) {
                    amountInGHS = Math.max(0, parseFloat((amountInGHS - discountAmount).toFixed(2)));
                }
            }
        } else {
            // Single product flow — apply manual discount normally
            const discountAmount = Number(clientMetadata?.discount_amount) || 0;
            if (discountAmount > 0) {
                amountInGHS = Math.max(0, parseFloat((amountInGHS - discountAmount).toFixed(2)));
            }
        }

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

        const paystackSecret = process.env.PAYSTACK_SECRET_KEY || "";
        if (!paystackSecret) {
            return NextResponse.json({
                authorizationUrl: "https://checkout.paystack.com/dummy",
                reference: "dummy-ref",
            });
        }

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
                total_amount: amountWithFee,
                status: "pending",
                items: cartArr,
                discount_code: clientMetadata?.discount_code || null,
                discount_amount: Number(clientMetadata?.discount_amount) || 0,
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

        const amountInPesewas = Math.round(amountWithFee * 100);
        const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://misstokyo.shop";
        const siteUrl = rawSiteUrl.replace(/\/+$/, "");

        // --- SPLIT GROUP (SPL_xxx) — only applied when amount is above Paystack's
        // minimum subaccount payout (~GHS 5). Below that, the 2.5% allocation
        // rounds to less than 1 pesewa and Paystack returns "No active channel".
        const paystackSplitCode = process.env.PAYSTACK_SPLIT_CODE;
        const splitPayload = (paystackSplitCode && amountWithFee >= 5) ? { split_code: paystackSplitCode } : {};

        // --- SUBACCOUNT (ACCT_xxx) — commented out while testing split groups ---
        // const paystackSubaccount = process.env.PAYSTACK_SUBACCOUNT;
        // const subPct = Number(process.env.PAYSTACK_SUBACCOUNT_PERCENTAGE) || 2.5;
        // const subaccountPayload = paystackSubaccount ? {
        //     subaccount: paystackSubaccount,
        //     bearer: "subaccount",
        //     transaction_charge: Math.round(amountInPesewas * ((100 - subPct) / 100)),
        // } : {};

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
                channels: ["card", "mobile_money", "bank", "bank_transfer", "ussd"],
                ...splitPayload,
                metadata: {
                    ...clientMetadata,
                    productId,
                    orderId,
                    cartItems: cartArr.length > 0 ? JSON.stringify(cartArr) : undefined,
                    // Override client-supplied fee values with server-calculated ones
                    platform_fee_amount: platformFeeAmount > 0 ? platformFeeAmount : undefined,
                    platform_fee_label: platformFeeLabel,
                    // Auto discount IDs for usage tracking in webhook
                    ...(appliedAutoDiscountIds.length > 0 ? {
                        auto_discount_ids: appliedAutoDiscountIds,
                    } : {}),
                },
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`[Paystack init] HTTP ${response.status}: ${errText}`);
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
