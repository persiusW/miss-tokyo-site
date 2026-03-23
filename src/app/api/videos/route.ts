import { NextResponse } from "next/server";
import { getVideoProducts, VIDEO_BATCH_SIZE } from "@/lib/products";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10));

    const result = await getVideoProducts(offset);

    return NextResponse.json(result, {
        headers: {
            // Videos are public — cache at edge for 30s to reduce DB load
            "Cache-Control": `public, s-maxage=30, stale-while-revalidate=${VIDEO_BATCH_SIZE * 3}`,
        },
    });
}
