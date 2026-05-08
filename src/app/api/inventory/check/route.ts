import { NextResponse } from "next/server";
import { getStockStatus, type ReserveItem } from "@/lib/inventory";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const raw = searchParams.get("items");

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

    const results = await getStockStatus(items);
    return NextResponse.json({ results }, { headers: { "Cache-Control": "private, no-store" } });
}
