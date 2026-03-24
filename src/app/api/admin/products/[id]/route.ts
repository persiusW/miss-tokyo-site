import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";

// Lightweight PATCH for single-field updates (e.g. toggling is_active)
// without requiring the full product payload that /api/admin/products PATCH needs.
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const serverClient = await createClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: caller } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!caller || !["admin", "owner", "sales_staff"].includes(caller.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    // Only allow safe scalar fields to be updated this way
    const allowed = ["is_active", "is_sale", "discount_value"] as const;
    const updateFields: Record<string, unknown> = {};
    for (const key of allowed) {
        if (key in body) updateFields[key] = body[key];
    }

    if (Object.keys(updateFields).length === 0) {
        return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
        .from("products")
        .update(updateFields)
        .eq("id", id);

    if (error) {
        console.error("[admin/products/[id] PATCH]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath("/shop", "page");
    revalidatePath("/catalog/products", "page");

    return NextResponse.json({ success: true });
}
