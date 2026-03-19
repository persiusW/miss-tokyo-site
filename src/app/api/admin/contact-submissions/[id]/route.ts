import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@/lib/supabaseServer";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const serverClient = await createClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: caller } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
    if (!caller || !["admin", "owner", "sales_staff"].includes(caller.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    let body: any;
    try { body = await req.json(); } catch { body = {}; }

    const { status } = body;
    const allowed = ["unread", "read", "replied"];
    if (status && !allowed.includes(status)) {
        return NextResponse.json({ success: false, message: "Invalid status" }, { status: 400 });
    }

    const update: Record<string, any> = {};
    if (status) update.status = status;
    if (status === "replied") update.replied_at = new Date().toISOString();

    const { error } = await supabaseAdmin
        .from("contact_submissions")
        .update(update)
        .eq("id", id);

    if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
