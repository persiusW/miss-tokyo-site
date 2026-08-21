import { NextResponse } from "next/server";
import { getStockStatus, type ReserveItem } from "@/lib/inventory";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const raw = searchParams.get("items");
    // The caller's own pending order, so its hold does not count against it.
    const excludeOrderId = searchParams.get("excludeOrderId") ?? undefined;

    if (!raw) {
        return NextResponse.json({ error: "items param required" }, { status: 400 });
    }

    let items: ReserveItem[];
    try {
        items = JSON.parse(raw);
        if (!Array.isArray(items)) throw new Error("items must be an array");
    } catch {
        return NextResponse.json({ error: "invalid items param" }, { status: 400 });
    }

    // Cap request size — this endpoint is unauthenticated (used by the cart drawer);
    // an unbounded array could be used to hammer the DB with a huge .in() query.
    if (items.length > 100) {
        return NextResponse.json({ error: "too many items (max 100)" }, { status: 400 });
    }

    const results = await getStockStatus(items, { excludeOrderId });
    return NextResponse.json({ results }, { headers: { "Cache-Control": "private, no-store" } });
}
