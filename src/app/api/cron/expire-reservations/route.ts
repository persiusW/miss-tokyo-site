// src/app/api/cron/expire-reservations/route.ts
// Called every 5 minutes by Vercel Cron (Pro tier) or external scheduler.
// Marks orders with expired reservations as 'expired'.
//
// IMPORTANT: Does NOT delete reservation rows.
// fn_combined_available_stock already ignores rows where expires_at < NOW(),
// so stock frees itself automatically. Keeping rows intact means a late
// Paystack webhook can still call confirmSale() and decrement stock correctly.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: expiredReservations, error } = await supabaseAdmin
        .from("online_reservations")
        .select("order_id")
        .lt("expires_at", new Date().toISOString());

    if (error) {
        console.error("[cron/expire-reservations]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const orderIds = [...new Set((expiredReservations ?? []).map((r: any) => r.order_id))];

    let expired = 0;
    for (const orderId of orderIds) {
        const { data: updated } = await supabaseAdmin
            .from("orders")
            .update({ status: "expired" })
            .eq("id", orderId)
            .eq("status", "pending")
            .select("id");
        if (updated && updated.length > 0) expired++;
    }

    return NextResponse.json({ expired });
}
