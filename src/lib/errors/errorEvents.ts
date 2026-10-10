// Best-effort record of which error codes people hit, for the errors card on
// AI Settings. Codes and page paths only; causes stay in the server log.
// Off unless ai_settings.mtai_error_log_enabled is true.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Audience } from "@/lib/errors/catalogue";
import { ErrorEventGate } from "@/lib/errors/errorPlace";

const SWITCH_TTL_MS = 60_000;
let cached: { on: boolean; at: number } | null = null;
// Anyone can reach a route that fails: keep repeats once a minute and at most
// 30 events a minute per server instance, so a flood can't bury real errors.
const gate = new ErrorEventGate(30, 60_000);

async function loggingOn(): Promise<boolean> {
    if (cached && Date.now() - cached.at < SWITCH_TTL_MS) return cached.on;
    const { data, error } = await supabaseAdmin.from("ai_settings").select("value").eq("key", "mtai_error_log_enabled").maybeSingle();
    const on = !error && data?.value === true;
    cached = { on, at: Date.now() };
    return on;
}

export async function recordErrorEvent(code: string, place: string | null, audience: Audience): Promise<void> {
    try {
        if (!(await loggingOn())) return;
        if (!gate.allow(`${code}|${place}|${audience}`, Date.now())) return;
        const { error } = await supabaseAdmin.from("app_error_events").insert({ code: code.slice(0, 10), place, audience });
        if (error) console.error("[error-events] insert failed", error.code);
    } catch {
        // Recording must never affect the response.
    }
}
