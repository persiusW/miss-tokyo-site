import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ isAdmin: false, role: null }, {
                headers: { "Cache-Control": "private, no-store" },
            });
        }
        const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();
        const role = profile?.role ?? null;
        const isAdmin = role === "admin" || role === "owner";
        return NextResponse.json({ isAdmin, role }, {
            headers: { "Cache-Control": "private, no-store" },
        });
    } catch {
        return NextResponse.json({ isAdmin: false, role: null }, {
            headers: { "Cache-Control": "private, no-store" },
        });
    }
}
