// The "needs attention" counts the side nav and Home both show, read one way
// so the two can never disagree. Server only (service role).
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { standingOf } from "@/lib/whatsapp/inbox";
import type { StaffRole } from "@/lib/admin/v2/server";
import { applyToPack } from "./orderViews";
import type { InboxBreakdown } from "./homeText";

/** Paid orders waiting to pack (Orders › Waiting to pack). */
export async function toPackCount(): Promise<number> {
    const r = await applyToPack(supabaseAdmin.from("orders").select("id", { count: "exact", head: true }));
    if (r.error) throw r.error;
    return r.count ?? 0;
}

/**
 * What the Inbox holds for a person: WhatsApp chats the assistant handed over,
 * unread contact forms, custom requests (when that feature is on) and, for
 * admins, questions the assistant sent them.
 */
export async function inboxBreakdown(role: StaffRole): Promise<InboxBreakdown & { total: number }> {
    const [chats, forms, store, questions] = await Promise.all([
        supabaseAdmin.from("whatsapp_conversations")
            .select("handed_off_at, dealt_with_at, last_inbound_at")
            .not("handed_off_at", "is", null)
            .limit(1000),
        supabaseAdmin.from("contact_submissions").select("id", { count: "exact", head: true }).eq("status", "unread"),
        supabaseAdmin.from("store_settings").select("enable_custom_requests").eq("id", "default").maybeSingle(),
        role === "admin"
            ? supabaseAdmin.from("ai_questions").select("id", { count: "exact", head: true }).eq("status", "open")
            : Promise.resolve({ count: 0, error: null }),
    ]);
    if (chats.error) throw chats.error;
    let requests = 0;
    if (store.data?.enable_custom_requests !== false) {
        const r = await supabaseAdmin.from("custom_requests").select("id", { count: "exact", head: true }).in("status", ["inquiry", "new"]);
        requests = r.count ?? 0;
    }
    const b = {
        chats: (chats.data ?? []).filter(c => standingOf(c) === "needs").length,
        forms: forms.count ?? 0,
        requests,
        questions: questions.count ?? 0,
    };
    return { ...b, total: b.chats + b.forms + b.requests + b.questions };
}
