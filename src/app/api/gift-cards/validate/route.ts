import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
    const code = req.nextUrl.searchParams.get("code");
    if (!code) {
        return NextResponse.json({ valid: false, error: "No code provided." }, { status: 400 });
    }

    const { data: card, error } = await supabaseAdmin
        .from("gift_cards")
        .select("id, code, remaining_value, initial_value, status, expires_at")
        .ilike("code", code.trim())
        .maybeSingle();

    if (error || !card) {
        return NextResponse.json({ valid: false, error: "Gift card not found." }, { status: 404 });
    }

    if (card.status !== "active") {
        const msg: Record<string, string> = {
            redeemed: "This gift card has been fully redeemed.",
            expired: "This gift card has expired.",
            cancelled: "This gift card has been cancelled.",
            pending_payment: "This gift card is not yet active.",
        };
        return NextResponse.json({ valid: false, error: msg[card.status] || "Gift card is not active." }, { status: 400 });
    }

    if (card.expires_at && new Date(card.expires_at) < new Date()) {
        // Mark expired
        await supabaseAdmin.from("gift_cards").update({ status: "expired" }).eq("id", card.id);
        return NextResponse.json({ valid: false, error: "This gift card has expired." }, { status: 400 });
    }

    return NextResponse.json({
        valid: true,
        balance: Number(card.remaining_value),
        original_amount: Number(card.initial_value),
        status: card.status,
        code: card.code,
    });
}
