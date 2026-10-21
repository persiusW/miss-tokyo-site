// While a person has a WhatsApp chat: how often the team is alerted again and
// the customer reminded, and the 24-hour return to the assistant. Each claim
// is a compare-and-set on its own column, so of two messages arriving
// together only one alerts. Server-only (service role).
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logConversationEvent } from "./events";
import { handBackState } from "./inbox";

const db = supabaseAdmin as any;

/** The team is alerted again when the customer writes this long after the last alert. */
export const REALERT_AFTER_MS = 60 * 60_000;
/** "Our team has your message" at most this often. */
export const REFER_EVERY_MS = 6 * 3600_000;
/** A chat goes back to the assistant by itself this long after it was handed over. */
export const AUTO_RESUME_AFTER_MS = 24 * 3600_000;

async function claim(conversationId: string, column: "team_alerted_at" | "team_referred_at", everyMs: number, now: Date): Promise<boolean> {
    const cutoff = new Date(now.getTime() - everyMs).toISOString();
    const { data, error } = await db.from("whatsapp_conversations").update({ [column]: now.toISOString() })
        .eq("id", conversationId).not("handed_off_at", "is", null)
        .or(`${column}.is.null,${column}.lt.${cutoff}`).select("id");
    if (error) throw new Error(`claim ${column}: ${error.code ?? ""} ${error.message ?? ""}`);
    return (data ?? []).length > 0;
}

/** True for the one caller that may alert the team again now. */
export const claimTeamAlert = (conversationId: string, now = new Date()) => claim(conversationId, "team_alerted_at", REALERT_AFTER_MS, now);
/** True for the one caller that may tell the customer the team has their message now. */
export const claimReferral = (conversationId: string, now = new Date()) => claim(conversationId, "team_referred_at", REFER_EVERY_MS, now);

/** Chats with a person for 24 hours go back to the assistant. Returns how many did. */
export async function autoResume(now = new Date(), limit = 50): Promise<number> {
    const cutoff = new Date(now.getTime() - AUTO_RESUME_AFTER_MS).toISOString();
    const { data, error } = await db.from("whatsapp_conversations").select("id, state, handed_off_at")
        .lt("handed_off_at", cutoff).order("handed_off_at", { ascending: true }).limit(limit);
    if (error) throw error;
    let resumed = 0;
    for (const c of (data ?? []) as { id: string; state: Record<string, unknown> | null; handed_off_at: string }[]) {
        // Only if nobody handed it over again in between.
        const { data: done, error: upError } = await db.from("whatsapp_conversations")
            .update({ handed_off_at: null, dealt_with_at: null, assigned_staff_id: null, state: handBackState(c.state, now) })
            .eq("id", c.id).eq("handed_off_at", c.handed_off_at).select("id");
        if (upError) { console.error("[whatsapp] auto-resume failed", { code: upError.code }); continue; }
        if ((done ?? []).length > 0) { resumed++; await logConversationEvent(c.id, "auto_resumed"); }
    }
    return resumed;
}

/** Turn lock (turnLock.ts): taken when empty or expired. */
export async function claimTurnLock(conversationId: string, until: Date, now: Date): Promise<boolean> {
    const { data, error } = await db.from("whatsapp_conversations").update({ turn_lock_until: until.toISOString() })
        .eq("id", conversationId).or(`turn_lock_until.is.null,turn_lock_until.lt.${now.toISOString()}`).select("id");
    if (error) throw new Error(`claim turn lock: ${error.code ?? ""} ${error.message ?? ""}`);
    return (data ?? []).length > 0;
}

/** Frees the turn lock only if it is still the one this turn took. */
export async function releaseTurnLock(conversationId: string, until: Date): Promise<void> {
    const { error } = await db.from("whatsapp_conversations").update({ turn_lock_until: null })
        .eq("id", conversationId).eq("turn_lock_until", until.toISOString());
    if (error) console.error("[whatsapp] could not free the turn lock", { code: error.code });
}
