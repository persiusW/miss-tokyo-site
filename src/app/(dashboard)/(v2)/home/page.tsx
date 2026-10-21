import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireV2Page } from "@/lib/admin/v2/server";
import { firstName } from "@/components/admin/ui/format";
import { dateLine, greeting } from "@/lib/admin/v2/homeText";
import { HomePage } from "@/components/admin/v2/home/HomePage";

export const metadata: Metadata = { title: "Home" };
export const dynamic = "force-dynamic";

// /home (was /overview). Every staff role sees the same page; the figures load
// from /api/admin/v2/home, which checks the role again.
export default async function HomeRoute() {
    const auth = await requireV2Page("home", "/home");
    const { data: profile } = await supabaseAdmin.from("profiles").select("full_name").eq("id", auth.userId).maybeSingle();
    const now = new Date();
    const name = firstName(profile?.full_name);
    return <HomePage title={name ? `${greeting(now)}, ${name}` : greeting(now)} sub={`${dateLine(now)}. Here's what needs you today.`} />;
}
