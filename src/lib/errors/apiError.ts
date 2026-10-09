// The only way a route reports a failure: the real cause goes to the server
// log (redacted), the client gets the catalogue code and calm text.
import { NextResponse } from "next/server";
import { errorBody, type Audience, type ErrorCode } from "@/lib/errors/catalogue";
import { redactText } from "@/lib/ai/missTokyoAi/scrub";

export function logCause(code: string, cause: unknown, context?: Record<string, unknown>) {
    const text = cause instanceof Error ? cause.message : typeof cause === "string" ? cause : cause == null ? "" : JSON.stringify(cause);
    console.error("[error]", code, context ?? {}, redactText(text).replace(/[\r\n]+/g, " ").slice(0, 500));
}

export function apiError(code: ErrorCode, opts: { status: number; audience: Audience; cause?: unknown; context?: Record<string, unknown> }) {
    logCause(code, opts.cause, opts.context);
    return NextResponse.json(errorBody(code, opts.audience), { status: opts.status });
}
