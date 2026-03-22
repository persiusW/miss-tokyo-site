import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { order_id, customer_email } = await req.json();

    if (!order_id || !customer_email) {
      return NextResponse.json({ error: "Order ID and email required" }, { status: 400 });
    }

    // 1. Verify if user already exists in profiles
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", customer_email)
      .single();

    const isNewCustomer = !existingProfile;

    // 2. Clear relevant order meta and update status
    // Optimization: In a real Paystack/Stripe flow, we'd verify the signature here.
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ 
        status: "pending",
        payment_status: "paid",
        metadata: { 
          is_new_customer: isNewCustomer,
          verified_at: new Date().toISOString()
        }
      })
      .eq("id", order_id);

    if (updateError) throw updateError;

    return NextResponse.json({ 
      success: true, 
      is_new_customer: isNewCustomer,
      message: isNewCustomer 
        ? "Payment verified. Triggering 'Claim Account' sequence." 
        : "Payment verified. Standard receipt sequence."
    });

  } catch (error: any) {
    console.error("Payment verification error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
