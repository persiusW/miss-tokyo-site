// The only way a route reports a failure: the real cause goes to the server
// log (redacted), the client gets the catalogue code and calm text.
import { after, NextResponse } from "next/server";
import { headers } from "next/headers";
import { errorBody, type Audience, type ErrorCode } from "@/lib/errors/catalogue";
import { redactText } from "@/lib/ai/missTokyoAi/scrub";
import { recordErrorEvent } from "@/lib/errors/errorEvents";
import { cleanPlace } from "@/lib/errors/errorPlace";

export function logCause(code: string, cause: unknown, context?: Record<string, unknown>) {
    const text = cause instanceof Error ? cause.message : typeof cause === "string" ? cause : cause == null ? "" : JSON.stringify(cause);
    console.error("[error]", code, context ?? {}, redactText(text).replace(/[\r\n]+/g, " ").slice(0, 500));
}

export function apiError(code: ErrorCode, opts: { status: number; audience: Audience; cause?: unknown; context?: Record<string, unknown> }) {
    logCause(code, opts.cause, opts.context);
    try {
        // After the response: the page the request came from, and the code.
        after(async () => {
            let place: string | null = null;
            try { place = cleanPlace((await headers()).get("referer")); } catch { /* no request headers */ }
            await recordErrorEvent(code, place, opts.audience);
        });
    } catch {
        // Called outside a request: nothing to record against.
    }
    return NextResponse.json(errorBody(code, opts.audience), { status: opts.status });
}
