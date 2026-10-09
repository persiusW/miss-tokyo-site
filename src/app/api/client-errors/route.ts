// Log-only sink for unhandled browser errors. No table; Vercel logs keep them.
import { NextRequest, NextResponse } from "next/server";
import { allowReport, buildReport } from "@/lib/errors/clientReport";

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        if (!allowReport(ip, Date.now())) return new NextResponse(null, { status: 204 });
        const text = await req.text();
        if (text.length > 2048) return new NextResponse(null, { status: 204 });
        const body = JSON.parse(text);
        // Rebuild server-side so nothing unredacted or oversized is logged.
        const r = buildReport(typeof body?.message === "string" ? body.message : "unknown", typeof body?.path === "string" ? body.path : "/");
        const stackTop = typeof body?.stackTop === "string" ? body.stackTop.slice(0, 200) : "";
        console.error("[client-error]", r.code, r.path, r.message, stackTop);
    } catch {
        // Malformed report: ignore.
    }
    return new NextResponse(null, { status: 204 });
}
