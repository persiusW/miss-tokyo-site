import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@/lib/supabaseServer";
import { apiError } from "@/lib/errors/apiError";

// POST /api/admin/invite-team/setup-link
// Regenerates an invite link for a pending (never signed in) team member
export async function POST(req: NextRequest) {
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

    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://misstokyo.shop";

    const { data: linkData, error } = await supabaseAdmin.auth.admin.generateLink({
        type: "invite",
        email,
        options: { redirectTo: `${baseUrl}/admin/login` },
    });

    if (error || !linkData) {
        return apiError("GEN-00", { status: 500, audience: "staff", cause: error });
    }

    const link = (linkData.properties as any)?.action_link;
    if (!link) {
        return NextResponse.json({ error: "No link returned" }, { status: 500 });
    }

    return NextResponse.json({ link });
}
