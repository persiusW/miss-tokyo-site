import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ isAdmin: false });
        }
        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();
        const isAdmin = profile?.role === "admin" || profile?.role === "owner";
        return NextResponse.json({ isAdmin }, {
            headers: { "Cache-Control": "private, no-store" },
        });
    } catch {
        return NextResponse.json({ isAdmin: false }, {
            headers: { "Cache-Control": "private, no-store" },
        });
    }
}
