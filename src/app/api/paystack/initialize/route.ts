import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
    try {
        const { productId, email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        let amountInGHS = 300; // default

        if (productId) {
            const { data: product } = await supabase
                .from("products")
                .select("price")
                .eq("id", productId)
                .single();

            if (product && product.price) {
                amountInGHS = Number(product.price);
            }
        }

        const amountInPesewas = amountInGHS * 100;
        const paystackSecret = process.env.PAYSTACK_SECRET_KEY || "";

        if (!paystackSecret) {
            // Return a dummy URL if no secret key is configured (for structural purposes)
            return NextResponse.json({
                authorizationUrl: "https://checkout.paystack.com/dummy",
                reference: "dummy-ref"
            });
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
                callback_url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/checkout/success`,
                metadata: {
                    productId,
                }
            }),
        });

        const data = await response.json();

        if (data.status) {
            return NextResponse.json({
                authorizationUrl: data.data.authorization_url,
                reference: data.data.reference,
            });
        } else {
            return NextResponse.json({ error: data.message }, { status: 400 });
        }
    } catch (error) {
        console.error("Paystack Init Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
