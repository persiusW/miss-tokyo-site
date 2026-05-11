import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { confirmSale } from "@/lib/inventory";
import { normAttr } from "@/lib/utils/normAttr";

const NO_STORE = { "Cache-Control": "private, no-store" } as const;
const ORDER_FIELDS = "id, customer_name, customer_email, customer_phone, shipping_address, delivery_method, total_amount, items, discount_code, discount_amount, status, paystack_reference";

async function fetchOrderForReceipt(orderId: string) {
    const { data } = await supabase.from("orders").select(ORDER_FIELDS).eq("id", orderId).single();
    return data;
}

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
            return NextResponse.json({ status: "skipped", reference }, { headers: NO_STORE });
        }

        const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET}`,
            },
        });

        const data = await response.json();

        if (!data.status || !data.data) {
            return NextResponse.json({ status: "failed" }, { headers: NO_STORE });
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
            // Fetch current order state for idempotency check and fallback item list
            const { data: currentOrder } = await supabase
                .from("orders")
                .select("payment_status, status, items")
                .eq("id", metaOrderId)
                .single();

            // Always update metadata fields
            await supabase
                .from("orders")
                .update({
                    paystack_reference: reference,
                    customer_name: fullName || null,
                    customer_phone: phone || null,
                    shipping_address: address ? { text: address } : null,
                    delivery_method: deliveryMethod || null,
                })
                .eq("id", metaOrderId);

            // Decrement stock and mark paid on success — scoped to "pending" for idempotency.
            // Verify is the primary stock-decrement path for local dev and webhook-miss scenarios.
            // Setting status="paid" here prevents double-decrement by the production webhook,
            // which checks status === "paid" for its own idempotency guard.
            if (paystackTxStatus === "success" && currentOrder?.payment_status === "pending") {
                let stockDecremented = false;
                try {
                    stockDecremented = await confirmSale(metaOrderId);
                } catch (e) {
                    console.error("[verify] confirmSale error:", e);
                }

                if (!stockDecremented) {
                    const orderItems: any[] = Array.isArray(currentOrder?.items) ? (currentOrder.items as any[]) : [];
                    if (orderItems.length > 0) {
                        const pIds = [...new Set(orderItems.map((i: any) => i.productId).filter(Boolean))];
                        const { data: fbProducts } = await supabase
                            .from("products")
                            .select("id, inventory_count, track_inventory, track_variant_inventory")
                            .in("id", pIds);
                        const fbProductMap = new Map((fbProducts ?? []).map((p: any) => [p.id, p]));

                        const variantTrackedPIds = new Set<string>(
                            (fbProducts ?? []).filter((p: any) => p.track_variant_inventory).map((p: any) => p.id as string)
                        );
                        const variantIdLookup: Record<string, string> = {};
                        if (variantTrackedPIds.size > 0) {
                            const { data: fbVariants } = await supabase
                                .from("product_variants")
                                .select("id, product_id, size, color, stitching, inventory_count")
                                .in("product_id", [...variantTrackedPIds]);
                            for (const v of fbVariants ?? []) {
                                const k = `${v.product_id}|${normAttr(v.size)}|${normAttr(v.color)}|${normAttr(v.stitching)}`;
                                variantIdLookup[k] = v.id;
                            }
                        }

                        await Promise.allSettled(orderItems.map(async (item: any) => {
                            const product = fbProductMap.get(item.productId);
                            if (!product || product.track_inventory === false) return;
                            const qty = item.quantity ?? 1;
                            if (product.track_variant_inventory) {
                                const lookupKey = `${item.productId}|${normAttr(item.size)}|${normAttr(item.color)}|${normAttr(item.stitching)}`;
                                const resolvedVariantId = variantIdLookup[lookupKey] ?? item.variantId ?? null;
                                if (resolvedVariantId) {
                                    const { data: variant } = await supabase
                                        .from("product_variants")
                                        .select("inventory_count")
                                        .eq("id", resolvedVariantId)
                                        .single();
                                    if (variant) {
                                        await supabase.from("product_variants")
                                            .update({ inventory_count: Math.max(0, (variant.inventory_count ?? 0) - qty) })
                                            .eq("id", resolvedVariantId);
                                    }
                                }
                                await supabase.from("products")
                                    .update({ inventory_count: Math.max(0, (product.inventory_count ?? 0) - qty) })
                                    .eq("id", item.productId);
                            } else {
                                await supabase.from("products")
                                    .update({ inventory_count: Math.max(0, (product.inventory_count ?? 0) - qty) })
                                    .eq("id", item.productId);
                            }
                        }));
                        console.log(`[verify] fallback stock decrement applied for order ${metaOrderId}`);
                    }
                }

                // Mark as paid — guarded by payment_status="pending" for idempotency
                await supabase
                    .from("orders")
                    .update({ payment_status: "paid", status: "paid" })
                    .eq("id", metaOrderId)
                    .eq("payment_status", "pending");

                revalidateTag("products", "max");
            }

            // Race-condition safety: webhook may have set payment_status="paid" before verify ran,
            // causing the block above to be skipped. Ensure status is always "paid" when Paystack
            // confirms success — only if still "pending" (won't touch packed/shipped/etc).
            if (paystackTxStatus === "success" && currentOrder?.status === "pending") {
                await supabase
                    .from("orders")
                    .update({ status: "paid" })
                    .eq("id", metaOrderId)
                    .eq("status", "pending");
            }

            const order = await fetchOrderForReceipt(metaOrderId);
            return NextResponse.json({ status: orderStatus, orderId: metaOrderId, order }, {
                headers: { "Cache-Control": "private, no-store" },
            });
        }

        // Check if order already exists for this reference
        const { data: existingOrder } = await supabase
            .from("orders")
            .select("id, status")
            .eq("paystack_reference", reference)
            .maybeSingle();

        if (existingOrder) {
            // Do not update status here — webhook is the sole owner of order status.
            const order = await fetchOrderForReceipt(existingOrder.id);
            return NextResponse.json({ status: orderStatus, orderId: existingOrder.id, order }, { headers: NO_STORE });
        }

        // Only create an order record if we have a customer email
        if (!customerEmail) {
            return NextResponse.json({ status: orderStatus }, { headers: NO_STORE });
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
            return NextResponse.json({ status: orderStatus }, { headers: NO_STORE });
        }

        // Inventory deduction is handled exclusively by the server-to-server webhook (charge.success).
        // Do not deduct here to avoid race conditions and double-deductions.

        const order = newOrder ? await fetchOrderForReceipt(newOrder.id) : null;
        return NextResponse.json({ status: orderStatus, orderId: newOrder?.id, order, created: true }, { headers: NO_STORE });
    } catch (err) {
        console.error("Verify Error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
