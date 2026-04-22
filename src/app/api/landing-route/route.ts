import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Cache the landing-route lookup — revalidate every 5 minutes
export const revalidate = 300;

export async function GET() {
  const { data } = await supabaseAdmin
    .from("store_settings")
    .select("homepage_route")
    .eq("id", "default")
    .maybeSingle();

  const route = (data as any)?.homepage_route ?? "home";
  return NextResponse.json({ route });
}
