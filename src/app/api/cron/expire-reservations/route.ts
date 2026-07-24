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

    // POS sessions expire the same way. /api/pos/expire only fires when a
    // customer opens their pay page, so a link nobody opens sat at
    // "pending_payment" forever and cluttered POS History. Availability was
    // never affected — fn_combined_available_stock ignores expired holds — so
    // this is bookkeeping, and like the online path above it deliberately
    // leaves pos_reservations rows in place: settlePosSession still settles a
    // late payment, and an expired hold no longer counts against stock.
    const { data: expiredPos } = await supabaseAdmin
        .from("pos_sessions")
        .update({ status: "expired" })
        .eq("status", "pending_payment")
        .lt("expires_at", new Date().toISOString())
        .select("id");

    const posExpired = expiredPos?.length ?? 0;
    if (posExpired > 0) console.log(`[cron/expire-reservations] expired ${posExpired} POS sessions`);

    return NextResponse.json({ expired, posExpired });
}
