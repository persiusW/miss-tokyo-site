import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
    try {
        const serverClient = await createClient();
        const { data: { user } } = await serverClient.auth.getUser();
        if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        const { data: caller } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
        if (!caller || !["admin", "owner"].includes(caller.role)) {
            return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
        }

        const { code, order_id, amount_to_use, redeemed_by } = await req.json();

        if (!code || !amount_to_use) {
            return NextResponse.json({ success: false, message: "code and amount_to_use are required." }, { status: 400 });
        }

        // Fetch gift card (select for update isn't available via JS client — use DB function in future)
        const { data: card, error } = await supabaseAdmin
            .from("gift_cards")
            .select("id, remaining_value, status, expires_at")
            .ilike("code", String(code).trim())
            .maybeSingle();

        if (error || !card) {
            return NextResponse.json({ success: false, message: "Gift card not found." }, { status: 404 });
        }

        if (card.status !== "active") {
            return NextResponse.json({ success: false, message: "Gift card is not active." }, { status: 400 });
        }

        if (card.expires_at && new Date(card.expires_at) < new Date()) {
            await supabaseAdmin.from("gift_cards").update({ status: "expired" }).eq("id", card.id);
            return NextResponse.json({ success: false, message: "Gift card has expired." }, { status: 400 });
        }

        const balanceBefore = Number(card.remaining_value);
        const amountUsed = Math.min(balanceBefore, Number(amount_to_use));
        const balanceAfter = parseFloat((balanceBefore - amountUsed).toFixed(2));
        const newStatus = balanceAfter <= 0 ? "redeemed" : "active";

        // Update balance
        const { error: updateErr } = await supabaseAdmin
            .from("gift_cards")
            .update({
                remaining_value: balanceAfter,
                status: newStatus,
                is_active: newStatus === "active",
                updated_at: new Date().toISOString(),
            })
            .eq("id", card.id);

        if (updateErr) {
            return NextResponse.json({ success: false, message: "Failed to update gift card balance." }, { status: 500 });
        }

        // Record redemption
        await supabaseAdmin.from("gift_card_redemptions").insert({
            gift_card_id: card.id,
            order_id: order_id || null,
            amount_used: amountUsed,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            redeemed_by: redeemed_by || null,
        });

        return NextResponse.json({ success: true, amount_used: amountUsed, new_balance: balanceAfter });
    } catch (err: any) {
        console.error("[gift-cards/redeem]", err);
        return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
    }
}
