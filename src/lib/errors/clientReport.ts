// Unhandled browser errors are reported, never shown. Pure so it can be
// unit-tested; ErrorNet and /api/client-errors wire it up.
import { redactText } from "@/lib/ai/missTokyoAi/scrub";

export type ClientReport = { code: "GEN-00"; path: string; message: string; stackTop: string };
export const REPORT_MAX_PER_LOAD = 20;
const WINDOW_MS = 10 * 60_000;
const PER_WINDOW = 20;

export function buildReport(err: unknown, path: string): ClientReport {
    const e = err as { message?: unknown; stack?: unknown } | null | undefined;
    const raw = typeof err === "string" ? err : typeof e?.message === "string" ? e.message : err == null ? "unknown" : String(err);
    const stack = typeof e?.stack === "string" ? e.stack.split("\n").find(l => l.trim().startsWith("at ")) ?? "" : "";
    return {
        code: "GEN-00",
        path: path.split("?")[0].slice(0, 200),
        message: redactText(raw).slice(0, 300),
        stackTop: redactText(stack.trim()).slice(0, 200),
    };
}

/** Sends each distinct error once, at most `max` per page load; stops after a failed send. */
export function createReporter(send: (r: ClientReport) => Promise<void>, max = REPORT_MAX_PER_LOAD) {
    const seen = new Set<string>();
    let count = 0;
    let broken = false;
    return (r: ClientReport) => {
        const key = `${r.message}|${r.stackTop}`;
        if (broken || count >= max || seen.has(key)) return;
        seen.add(key);
        count++;
        send(r).catch(() => { broken = true; });
    };
}

const hits = new Map<string, number[]>();
/** Best-effort per-IP limit (per server instance). */
export function allowReport(ip: string, now: number): boolean {
    const recent = (hits.get(ip) ?? []).filter(t => now - t < WINDOW_MS);
    if (recent.length >= PER_WINDOW) { hits.set(ip, recent); return false; }
    recent.push(now);
    hits.set(ip, recent);
    return true;
}
