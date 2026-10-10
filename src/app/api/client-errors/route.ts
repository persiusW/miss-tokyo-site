// Sink for unhandled browser errors. The detail goes to the Vercel log; only
// the code and page reach app_error_events (when that switch is on).
import { after, NextRequest, NextResponse } from "next/server";
import { allowReport, buildReport, oneLine } from "@/lib/errors/clientReport";
import { redactText } from "@/lib/ai/missTokyoAi/scrub";
import { recordErrorEvent } from "@/lib/errors/errorEvents";
import { audienceForPath, cleanPlace } from "@/lib/errors/errorPlace";

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
        const place = cleanPlace(r.path);
        after(() => recordErrorEvent(r.code, place, audienceForPath(place ?? "/")));
    } catch {
        // Malformed report: ignore.
    }
    return new NextResponse(null, { status: 204 });
}
