import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ isAdmin: false });
        }
        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();
        const isAdmin = profile?.role === "admin" || profile?.role === "owner";
        return NextResponse.json({ isAdmin });
    } catch {
        return NextResponse.json({ isAdmin: false });
    }
}
