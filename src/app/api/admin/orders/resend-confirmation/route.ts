import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@/lib/supabaseServer";
import { sendOrderConfirmation } from "@/lib/orderEmail";
import { sendSMS, injectSmsVars } from "@/lib/sms";

export async function POST(req: NextRequest) {
    const serverClient = await createClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: caller } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!caller || !["admin", "owner", "sales_staff"].includes(caller.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { orderId } = await req.json();
    if (!orderId) return NextResponse.json({ error: "orderId is required" }, { status: 400 });

    const [{ data: order }, { data: biz }, { data: ss }] = await Promise.all([
        supabaseAdmin.from("orders").select("*").eq("id", orderId).single(),
        supabaseAdmin.from("business_settings").select("business_name, address, contact").eq("id", "default").single(),
        supabaseAdmin.from("site_settings").select("pickup_enabled, pickup_instructions, pickup_address, pickup_contact_phone, pickup_estimated_wait").eq("id", "singleton").single(),
    ]);

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (!order.customer_email) return NextResponse.json({ error: "Order has no customer email" }, { status: 400 });

    const bizName = biz?.business_name || "Miss Tokyo";
    const bizAddress = biz?.address || "";
    const orderRef = order.id.substring(0, 8).toUpperCase();
    const amountGHS = Number(order.total_amount);
    const isPickup = (order.delivery_method as string | undefined)?.toLowerCase().includes("pickup") ?? false;
    const pickupMeta = isPickup && ss?.pickup_enabled ? {
        isPickup: true,
        pickupInstructions: ss?.pickup_instructions || "",
        pickupAddress: ss?.pickup_address || biz?.address || "",
        pickupPhone: ss?.pickup_contact_phone || biz?.contact || "",
        pickupWait: ss?.pickup_estimated_wait || "24 hours",
    } : {};

    const items = Array.isArray(order.items) ? order.items : [];

    const emailErrors: string[] = [];

    // Send confirmation email
    try {
        await sendOrderConfirmation({
            customerEmail: order.customer_email,
            orderRef,
            amount: amountGHS,
            bizName,
            bizAddress,
            items,
            discountCode: order.discount_code || undefined,
            discountAmount: Number(order.discount_amount) || undefined,
            ...pickupMeta,
        });
    } catch (err: any) {
        console.error("[resend-confirmation] email failed:", err);
        emailErrors.push(`Email: ${err?.message || "failed"}`);
    }

    // Optionally resend SMS if phone is present
    if (order.customer_phone) {
        try {
            const { data: smsTpl } = await supabaseAdmin
                .from("communication_templates")
                .select("body_text, greeting")
                .eq("channel", "sms")
                .eq("event_type", "order_confirmed")
                .single();

            const firstName = (order.customer_name as string | undefined)?.split(" ")[0] || "there";
            const vars: Record<string, string> = {
                order_id: orderRef,
                customer_name: firstName,
                amount: `GH₵ ${amountGHS.toFixed(2)}`,
                rider_name: "",
                rider_phone: "",
            };

            let message: string;
            if (smsTpl?.body_text) {
                const greeting = smsTpl.greeting ? injectSmsVars(smsTpl.greeting, vars) + " " : "";
                message = greeting + injectSmsVars(smsTpl.body_text, vars);
            } else {
                message = `Hi ${firstName}, your ${bizName} order #${orderRef} is confirmed! Check your email for your receipt. Thank you!`;
            }

            await sendSMS({ to: order.customer_phone, message });
        } catch (err: any) {
            console.error("[resend-confirmation] SMS failed:", err);
            emailErrors.push(`SMS: ${err?.message || "failed"}`);
        }
    }

    if (emailErrors.length > 0) {
        return NextResponse.json({ success: false, errors: emailErrors }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
