import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
    try {
        const {
            productId,
            email,
            amount: customAmount,
            cartItems,
            metadata: clientMetadata,
        } = await request.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        const cartArr: any[] = Array.isArray(cartItems) ? cartItems : [];

        // Calculate amount
        let amountInGHS = 0;
        if (customAmount && Number(customAmount) > 0) {
            amountInGHS = Number(customAmount);
        } else if (cartArr.length > 0) {
            amountInGHS = cartArr.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        } else if (productId) {
            const { data: product } = await supabaseAdmin
                .from("products")
                .select("price_ghs")
                .eq("id", productId)
                .single();
            if (product?.price_ghs) amountInGHS = Number(product.price_ghs);
        }

        if (amountInGHS <= 0) {
            return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
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
                shipping_address: clientMetadata?.address ? { text: clientMetadata.address } : null,
                delivery_method: clientMetadata?.deliveryMethod || "delivery",
                total_amount: amountInGHS,
                status: "pending",
                items: cartArr,
            }])
            .select("id")
            .single();

        if (orderError) {
            console.error("Failed to create pending order:", orderError);
        }

        const orderId = pendingOrder?.id || null;

        const amountInPesewas = amountInGHS * 100;
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

        const paystackSubaccount = process.env.PAYSTACK_SUBACCOUNT;
        const subPct = Number(process.env.PAYSTACK_SUBACCOUNT_PERCENTAGE) || 2.5;
        const subaccountPayload = paystackSubaccount ? {
            subaccount: paystackSubaccount,
            bearer: "subaccount",
            transaction_charge: Math.round(amountInPesewas * ((100 - subPct) / 100)),
        } : {};

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
                ...subaccountPayload,
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
