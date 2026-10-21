// Side-nav counts for admin v2: Inbox shows conversations that need a person,
// Orders shows paid orders waiting to pack. Same rules as the pages they open.
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireStaff } from "@/lib/ai/requireStaff";
import { standingOf } from "@/lib/whatsapp/inbox";
import { apiError } from "@/lib/errors/apiError";

export const dynamic = "force-dynamic";

export async function GET() {
    const auth = await requireStaff();
    if ("status" in auth) return apiError("AUTH-01", { status: auth.status, audience: "staff" });
    try {
        const [toPack, chats, forms, store, questions] = await Promise.all([
            supabaseAdmin.from("orders").select("id", { count: "exact", head: true })
                .eq("payment_status", "paid")
                .in("fulfillment_status", ["inbox", "processing"])
                .not("status", "in", "(cancelled,refunded,fulfilled,delivered)"),
            supabaseAdmin.from("whatsapp_conversations")
                .select("handed_off_at, dealt_with_at, last_inbound_at")
                .not("handed_off_at", "is", null)
                .limit(1000),
            supabaseAdmin.from("contact_submissions").select("id", { count: "exact", head: true }).eq("status", "unread"),
            supabaseAdmin.from("store_settings").select("enable_custom_requests").eq("id", "default").maybeSingle(),
            auth.role === "admin"
                ? supabaseAdmin.from("ai_questions").select("id", { count: "exact", head: true }).eq("status", "open")
                : Promise.resolve({ count: 0 }),
        ]);
        let requests = 0;
        if (store.data?.enable_custom_requests !== false) {
            const r = await supabaseAdmin.from("custom_requests").select("id", { count: "exact", head: true }).in("status", ["inquiry", "new"]);
            requests = r.count ?? 0;
        }
        const needs = (chats.data ?? []).filter(c => standingOf(c) === "needs").length;
        return NextResponse.json({
            orders: toPack.count ?? 0,
            inbox: needs + (forms.count ?? 0) + requests + (questions.count ?? 0),
        });
    } catch (cause) {
        return apiError("GEN-00", { status: 500, audience: "staff", cause });
    }
}
