import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
    // Auth check — only admin/owner can invite
    const serverClient = await createClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: caller } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!caller || !["admin", "owner"].includes(caller.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { email, role } = await req.json();
    if (!email || !role) {
        return NextResponse.json({ error: "email and role are required" }, { status: 400 });
    }
    if (!["admin", "sales_staff"].includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Invite the user — sends a magic-link email
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/admin/login`,
    });

    if (inviteError || !inviteData.user) {
        return NextResponse.json({ error: inviteError?.message || "Invite failed" }, { status: 500 });
    }

    // Set their profile role immediately
    const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .upsert({ id: inviteData.user.id, email, role }, { onConflict: "id" });

    if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, userId: inviteData.user.id });
}
