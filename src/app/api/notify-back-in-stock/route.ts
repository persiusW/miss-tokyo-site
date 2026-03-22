import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  try {
    const serverClient = await createClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: caller } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
    if (!caller || !["admin", "owner"].includes(caller.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
