import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";

function parseCartItems(cartItems: unknown): any[] {
    if (!cartItems) return [];
    try {
        return typeof cartItems === "string" ? JSON.parse(cartItems) : (cartItems as any[]);
    } catch {
        return [];
    }
}

function paystackStatusToOrderStatus(paystackStatus: string): string {
    switch (paystackStatus) {
        case "success": return "paid";
        case "failed": return "cancelled";
        case "abandoned": return "cancelled";
        default: return "pending";
    }
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const reference = searchParams.get("reference") || searchParams.get("trxref");

        if (!reference) {
            return NextResponse.json({ error: "No reference provided" }, { status: 400 });
        }

        const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "";
        if (!PAYSTACK_SECRET) {
            return NextResponse.json({ status: "skipped", reference });
        }

        const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET}`,
            },
        });

        const data = await response.json();

        if (!data.status || !data.data) {
            return NextResponse.json({ status: "failed" });
        }

        const txData = data.data;
        const paystackTxStatus: string = txData.status; // "success" | "failed" | "abandoned" | "ongoing"
        const metadata = txData.metadata || {};
        const { orderId: metaOrderId, fullName, phone, address, deliveryMethod, cartItems } = metadata;
        const customerEmail: string = txData.customer?.email || "";
        const amountGHS = Number(txData.amount) / 100;
        const orderStatus = paystackStatusToOrderStatus(paystackTxStatus);

        // If order was pre-created at checkout initialization, update it directly
        if (metaOrderId) {
            await supabase
                .from("orders")
                .update({
                    status: orderStatus,
                    paystack_reference: reference,
                    customer_name: fullName || null,
                    customer_phone: phone || null,
                    shipping_address: address ? { text: address } : null,
                    delivery_method: deliveryMethod || null,
                })
                .eq("id", metaOrderId);
            return NextResponse.json({ status: orderStatus, orderId: metaOrderId });
        }

        // Check if order already exists for this reference
        const { data: existingOrder } = await supabase
            .from("orders")
            .select("id, status")
            .eq("paystack_reference", reference)
            .single();

        if (existingOrder) {
            // Update status if payment is now confirmed
            if (paystackTxStatus === "success" && existingOrder.status !== "paid") {
                await supabase.from("orders").update({ status: "paid" }).eq("id", existingOrder.id);
            }
            return NextResponse.json({ status: orderStatus, orderId: existingOrder.id });
        }

        // Only create an order record if we have a customer email
        if (!customerEmail) {
            return NextResponse.json({ status: orderStatus });
        }

        const parsedItems = parseCartItems(cartItems);

        const { data: newOrder, error } = await supabase
            .from("orders")
            .insert([{
                customer_email: customerEmail,
                customer_name: fullName || null,
                customer_phone: phone || null,
                shipping_address: address ? { text: address } : null,
                delivery_method: deliveryMethod || "delivery",
                total_amount: amountGHS,
                status: orderStatus,
                paystack_reference: reference,
                items: parsedItems,
            }])
            .select("id")
            .single();

        if (error) {
            console.error("Verify: Failed to insert order:", error);
            return NextResponse.json({ status: orderStatus });
        }

        // Deduct inventory only for successful payments — batch fetch then concurrent updates
        if (newOrder && paystackTxStatus === "success" && parsedItems.length > 0) {
            const productIds = [...new Set(parsedItems.map((i: any) => i.productId).filter(Boolean))];
            const { data: products } = await supabase
                .from("products")
                .select("id, inventory_count")
                .in("id", productIds);

            if (products) {
                const stockMap = new Map(products.map(p => [p.id, p.inventory_count as number]));
                await Promise.allSettled(
                    parsedItems
                        .filter((item: any) => item.productId && stockMap.has(item.productId))
                        .map((item: any) => {
                            const stock = stockMap.get(item.productId) ?? 0;
                            if (typeof stock === "number" && stock >= item.quantity) {
                                return supabase
                                    .from("products")
                                    .update({ inventory_count: stock - item.quantity })
                                    .eq("id", item.productId);
                            }
                            return Promise.resolve();
                        })
                );
            }
        }

        return NextResponse.json({ status: orderStatus, orderId: newOrder?.id, created: true });
    } catch (err) {
        console.error("Verify Error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
