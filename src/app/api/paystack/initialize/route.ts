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
                .select("id, price_ghs, is_sale, discount_value")
                .in("id", pIds);

            const dbPriceMap = (dbProducts || []).reduce((acc: any, p: any) => {
                const base = p.is_sale && p.discount_value > 0 ? p.price_ghs * (1 - p.discount_value / 100) : p.price_ghs;
                acc[p.id] = base;
                return acc;
            }, {});

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

        if (amountInGHS <= 0) {
            return NextResponse.json({ error: "Invalid amount calculation" }, { status: 400 });
        }

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
                total_amount: amountInGHS,
                status: "pending",
                items: cartArr,
                discount_code: clientMetadata?.discount_code || null,
                discount_amount: Number(clientMetadata?.discount_amount) || 0,
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

        const amountInPesewas = amountInGHS * 100;
        const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
        const siteUrl = rawSiteUrl.replace(/\/+$/, "");

        // --- SPLIT GROUP (SPL_xxx) — active for testing ---
        const paystackSplitCode = process.env.PAYSTACK_SPLIT_CODE;
        const splitPayload = paystackSplitCode ? { split_code: paystackSplitCode } : {};

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
                },
            }),
        });

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
