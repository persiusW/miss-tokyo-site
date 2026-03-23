import { NextResponse } from "next/server";
import { getProducts } from "@/lib/products";
import { createClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    // Detect user role so wholesale filters are applied correctly.
    // Falls back to undefined (retail/guest) on any auth failure.
    let role: string | undefined;
    try {
        const supabase = await createClient();
        const { data, error } = await supabase.auth.getUser();
        if (!error && data?.user) {
            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", data.user.id)
                .maybeSingle();
            role = profile?.role ?? undefined;
        }
    } catch {
        // Safe to ignore — anonymous fetch proceeds
    }

    const { products, total } = await getProducts(
        {
            category: searchParams.get("category"),
            sort:     searchParams.get("sort"),
            color:    searchParams.get("color"),
            size:     searchParams.get("size"),
            min:      searchParams.get("min"),
            max:      searchParams.get("max"),
            page:     searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1,
            q:        searchParams.get("q"),
            sale:     searchParams.get("sale") === "true",
        },
        role,
    );

    // Authenticated requests may see role-filtered results — must not be shared via CDN
    const cacheControl = role
        ? "private, no-store"
        : "public, s-maxage=60, stale-while-revalidate=300";

    return NextResponse.json({ products, total }, {
        headers: { "Cache-Control": cacheControl },
    });
}
