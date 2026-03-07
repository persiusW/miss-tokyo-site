import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabase } from "@/lib/supabase";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";

export async function POST(req: Request) {
    try {
        const rawBody = await req.text();
        const signature = req.headers.get("x-paystack-signature");

        if (!PAYSTACK_SECRET) {
            console.warn("No Paystack secret configured. Webhook skipped.");
            return NextResponse.json({ status: "skipped" });
        }

        // Verify Signature
        const hash = crypto
            .createHmac("sha512", PAYSTACK_SECRET)
            .update(rawBody)
            .digest("hex");

        if (hash !== signature) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        const event = JSON.parse(rawBody);

        if (event.event === "charge.success") {
            const data = event.data;
            const metadata = data.metadata || {};
            const { productId, requestId } = metadata;

            if (requestId) {
                // If it was a custom request payment
                await supabase
                    .from("custom_requests")
                    .update({ status: "confirmed" })
                    .eq("id", requestId);
            } else if (productId) {
                // Find existing order if passed, or create a simple log
                // (Assuming you have an orders table hooked up via a separate flow,
                // or we just rely on updating inventory directly).

                // Decrement inventory
                const { data: product } = await supabase
                    .from("products")
                    .select("inventory_count")
                    .eq("id", productId)
                    .single();

                if (product && typeof product.inventory_count === 'number' && product.inventory_count > 0) {
                    await supabase
                        .from("products")
                        .update({ inventory_count: product.inventory_count - 1 })
                        .eq("id", productId);
                }

                // Optional: Update an explicit orders table if metadata contains orderId
                if (metadata.orderId) {
                    await supabase
                        .from("orders")
                        .update({ status: "paid" })
                        .eq("id", metadata.orderId);
                }
            }
        }

        return NextResponse.json({ status: "success" });
    } catch (err) {
        console.error("Webhook Error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
