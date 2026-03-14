import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Using service role for administrative updates
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { product_id } = await req.json();

    if (!product_id) {
      return NextResponse.json({ error: "Product ID required" }, { status: 400 });
    }

    // 1. Fetch all pending requests for this product
    const { data: requests, error: fetchError } = await supabaseAdmin
      .from("back_in_stock_requests")
      .select("email, product_id")
      .eq("product_id", product_id)
      .eq("status", "pending");

    if (fetchError) throw fetchError;

    if (!requests || requests.length === 0) {
      return NextResponse.json({ message: "No pending requests found" });
    }

    // 2. Trigger notifications (Mocked for now - logic would go here to send emails via Resend/SendGrid)

    // 3. Update status to 'notified'
    const { error: updateError } = await supabaseAdmin
      .from("back_in_stock_requests")
      .update({ status: "notified" })
      .eq("product_id", product_id)
      .eq("status", "pending");

    if (updateError) throw updateError;

    return NextResponse.json({ 
      success: true, 
      count: requests.length 
    });

  } catch (error: any) {
    console.error("Back in stock notification error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
