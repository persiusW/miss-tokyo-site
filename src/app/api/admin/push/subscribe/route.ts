import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@/lib/supabaseServer";

export async function POST(req: Request) {
    try {
        // Auth via cookie session (same pattern as other protected routes)
        const supabase = await createClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { subscription } = await req.json();
        if (!subscription?.endpoint) return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });

        const { error } = await supabaseAdmin
            .from("admin_push_subscriptions")
            .upsert(
                {
                    user_id:  user.id,
                    endpoint: subscription.endpoint,
                    p256dh:   subscription.keys?.p256dh ?? "",
                    auth:     subscription.keys?.auth   ?? "",
                },
                { onConflict: "endpoint" },
            );

        if (error) {
            console.error("[push/subscribe] DB error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ status: "subscribed" });
    } catch (err: any) {
        console.error("[push/subscribe] Error:", err);
        return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { endpoint } = await req.json();
        if (!endpoint) return NextResponse.json({ error: "endpoint required" }, { status: 400 });

        await supabaseAdmin
            .from("admin_push_subscriptions")
            .delete()
            .eq("endpoint", endpoint);

        return NextResponse.json({ status: "unsubscribed" });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
    }
}
