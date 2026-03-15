import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/invoice/paystack-link
 * Creates a Paystack payment link for an invoice using the Payment Pages API.
 */
export async function POST(req: NextRequest) {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
        return NextResponse.json({ error: "Paystack not configured." }, { status: 500 });
    }

    try {
        const { invoiceId, amount, customerEmail } = await req.json();

        if (!invoiceId || !amount) {
            return NextResponse.json({ error: "invoiceId and amount are required." }, { status: 400 });
        }

        // Fetch fee settings
        const { data: feeData } = await supabaseAdmin
            .from("store_settings")
            .select("platform_fee_percentage, platform_fee_label")
            .eq("id", "default")
            .single();

        const feePct = Number(feeData?.platform_fee_percentage) || 0;
        const feeLabel = feeData?.platform_fee_label || "Service Charge";
        const baseAmount = Number(amount);
        const feeAmount = parseFloat((baseAmount * (feePct / 100)).toFixed(2));
        const finalAmount = parseFloat((baseAmount + feeAmount).toFixed(2));

        // Convert GHS amount to pesewas (Paystack uses lowest currency unit)
        const amountInPesewas = Math.round(finalAmount * 100);

        const paystackSubaccount = process.env.PAYSTACK_SUBACCOUNT;
        const subPct = Number(process.env.PAYSTACK_SUBACCOUNT_PERCENTAGE) || 2.5;
        const subaccountPayload = paystackSubaccount ? {
            subaccount: paystackSubaccount,
            bearer: "subaccount",
            transaction_charge: Math.round(amountInPesewas * ((100 - subPct) / 100)),
        } : {};

        const body: Record<string, any> = {
            name: `Invoice #${invoiceId.substring(0, 8).toUpperCase()}`,
            description: `Payment for invoice #${invoiceId.substring(0, 8).toUpperCase()}`,
            amount: amountInPesewas,
            currency: "GHS",
            channels: ["card", "mobile_money", "bank", "bank_transfer", "ussd"],
            ...subaccountPayload,
            metadata: {
                invoice_id: invoiceId,
                source: "invoice",
                platform_fee_amount: feeAmount,
                platform_fee_label: feeLabel,
            },
        };

        if (customerEmail) {
            body.custom_fields = [
                { display_name: "Customer Email", variable_name: "customer_email", value: customerEmail },
            ];
        }

        const res = await fetch("https://api.paystack.co/paymentrequest", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${secretKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok || !data.status) {
            console.error("[invoice/paystack-link]", data);
            return NextResponse.json({ error: data.message || "Paystack error" }, { status: 500 });
        }

        // The offline payment link
        const link = data.data?.offline_reference
            ? `https://paystack.com/pay/${data.data.offline_reference}`
            : data.data?.hosted_url || data.data?.payment_url;

        if (!link) {
            return NextResponse.json({ error: "Could not extract payment URL from Paystack." }, { status: 500 });
        }

        return NextResponse.json({ link, reference: data.data?.offline_reference });
    } catch (err: any) {
        console.error("[invoice/paystack-link]", err);
        return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
    }
}
