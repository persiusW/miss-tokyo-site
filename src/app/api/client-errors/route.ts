// Log-only sink for unhandled browser errors. No table; Vercel logs keep them.
import { NextRequest, NextResponse } from "next/server";
import { allowReport, buildReport, oneLine } from "@/lib/errors/clientReport";
import { redactText } from "@/lib/ai/missTokyoAi/scrub";

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        if (!allowReport(ip, Date.now())) return new NextResponse(null, { status: 204 });
        if (Number(req.headers.get("content-length") ?? 0) > 2048) return new NextResponse(null, { status: 204 });
        const text = await req.text();
        if (text.length > 2048) return new NextResponse(null, { status: 204 });
        const body = JSON.parse(text);
        // Rebuild server-side so nothing unredacted or oversized is logged.
        const r = buildReport(typeof body?.message === "string" ? body.message : "unknown", typeof body?.path === "string" ? body.path : "/");
        const stackTop = typeof body?.stackTop === "string" ? redactText(body.stackTop).slice(0, 200) : "";
        console.error("[client-error]", r.code, oneLine(r.path), oneLine(r.message), oneLine(stackTop));
    } catch {
        // Malformed report: ignore.
    }
    return new NextResponse(null, { status: 204 });
}
