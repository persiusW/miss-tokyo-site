// The Supabase side of the inbound pipeline. Server-only (service role).
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logConversationEvent } from "./events";
import { MAX_ATTEMPTS, REPROCESS_WINDOW_MS, RETRY_AFTER_MS, type Conversation, type InboundEvent, type InboundStore } from "./pipeline";

// inbound_events and the new whatsapp_conversations columns are not in the generated types yet.
const db = supabaseAdmin as any;

const EVENT_FIELDS = "id, provider, raw_body, headers, received_at, attempts, last_attempt_at, processed_at, gave_up_at";

function fail(what: string, error: { code?: string; message?: string }): never {
    throw new Error(`${what}: ${error.code ?? ""} ${error.message ?? ""}`.trim());
}

export const supabaseInboundStore: InboundStore & {
    /** Events from one number received strictly between two times, for photo pairing. */
    eventsBetween(provider: string, fromIso: string, toIso: string, phone: string): Promise<{ receivedAt: string; rawBody: string }[]>;
} = {
    async eventsBetween(provider, fromIso, toIso, phone) {
        // Meta's payload is compact JSON. Should that change, nothing matches and photos are answered on their own.
        const { data, error } = await db.from("inbound_events").select("received_at, raw_body")
            .eq("provider", provider).gt("received_at", fromIso).lt("received_at", toIso)
            .like("raw_body", `%"from":"${phone.replace(/\D/g, "")}"%`).order("received_at").limit(50);
        if (error) fail("read nearby events", error);
        return (data ?? []).map((r: { received_at: string; raw_body: string }) => ({ receivedAt: r.received_at, rawBody: r.raw_body }));
    },

    async claim(id, now) {
        const { data: ev, error } = await db.from("inbound_events").select(EVENT_FIELDS).eq("id", id).maybeSingle();
        if (error) fail("read event", error);
        if (!ev || ev.processed_at || ev.gave_up_at || ev.attempts >= MAX_ATTEMPTS) return null;
        if (ev.last_attempt_at && now.getTime() - new Date(ev.last_attempt_at).getTime() < RETRY_AFTER_MS) return null;
        // Compare-and-set on attempts: of two racing runs, one wins the attempt.
        const { data: claimed, error: claimError } = await db.from("inbound_events")
            .update({ attempts: ev.attempts + 1, last_attempt_at: now.toISOString() })
            .eq("id", id).eq("attempts", ev.attempts).is("processed_at", null).is("gave_up_at", null)
            .select(EVENT_FIELDS).maybeSingle();
        if (claimError) fail("claim event", claimError);
        return (claimed as InboundEvent | null) ?? null;
    },

    async touchConversation(phone, name, at, provider, userId) {
        const pick = "id, handed_off_at, last_inbound_at, wa_contact_name, wa_user_id";
        const read = () => db.from("whatsapp_conversations").select(pick).eq("wa_phone_number", phone).maybeSingle();
        let { data: row, error } = await read();
        if (error) fail("read conversation", error);
        if (!row) {
            const ins = await db.from("whatsapp_conversations")
                .insert({ wa_phone_number: phone, wa_contact_name: name, wa_user_id: userId ?? null, provider, last_inbound_at: at, last_message_at: at })
                .select(pick).single();
            if (ins.error?.code === "23505") ({ data: row, error } = await read());   // opened by a parallel run
            else if (ins.error) fail("open conversation", ins.error);
            else row = ins.data;
            if (error) fail("read conversation", error);
        }
        const patch: Record<string, unknown> = {};
        if (!row.last_inbound_at || new Date(row.last_inbound_at) < new Date(at)) Object.assign(patch, { last_inbound_at: at, last_message_at: at });
        if (!row.wa_contact_name && name) patch.wa_contact_name = name;
        if (userId && row.wa_user_id !== userId) patch.wa_user_id = userId;
        if (Object.keys(patch).length > 0) {
            const { error: upError } = await db.from("whatsapp_conversations").update(patch).eq("id", row.id);
            if (upError) fail("touch conversation", upError);
        }
        return { id: row.id, handedOffAt: row.handed_off_at ?? null } satisfies Conversation;
    },

    async seen(waMessageId) {
        const { data, error } = await db.from("message_log").select("id").eq("wa_message_id", waMessageId).limit(1);
        if (error) fail("check message", error);
        return (data ?? []).length > 0;
    },

    async logInbound(conversationId, m, at) {
        const { error } = await db.from("message_log").insert({
            conversation_id: conversationId, direction: "inbound", content: m.text ?? (m.tap ? `[tapped: ${m.tap.title}]` : null), wa_message_id: m.messageId, message_type: m.type, created_at: at,
        });
        if (error && error.code !== "23505") fail("log message", error);   // 23505: already logged by a replay
    },

    async markProcessed(id, f) {
        const { error } = await db.from("inbound_events").update({
            processed_at: new Date().toISOString(), error: f.note ?? null, parsed: f.parsed, external_id: f.externalId,
            wa_phone: f.waPhone, conversation_id: f.conversationId,
        }).eq("id", id);
        if (error?.code === "23505") {
            // Another stored event already carries this external id: a replay. Done, without the id.
            const { error: e2 } = await db.from("inbound_events").update({
                processed_at: new Date().toISOString(), error: "replay of an event already stored", parsed: f.parsed,
                wa_phone: f.waPhone, conversation_id: f.conversationId,
            }).eq("id", id);
            if (e2) fail("mark processed", e2);
        } else if (error) fail("mark processed", error);
    },

    async markFailed(id, message, f) {
        const { error } = await db.from("inbound_events").update({ error: message, wa_phone: f.waPhone, conversation_id: f.conversationId }).eq("id", id);
        if (error) fail("mark failed", error);
    },

    async giveUp(id, message, f) {
        const { error } = await db.from("inbound_events").update({
            gave_up_at: new Date().toISOString(), error: message, wa_phone: f.waPhone, conversation_id: f.conversationId,
        }).eq("id", id);
        if (error) fail("give up", error);
    },

    async handOff(conversationId, reason, now) {
        const { data: row, error } = await db.from("whatsapp_conversations").select("state").eq("id", conversationId).maybeSingle();
        if (error) fail("read conversation", error);
        if (!row) return false;
        const state = { ...(row.state ?? {}), mode: "human", reason, since: now.toISOString() };
        // Only the run that finds it unassigned makes the move, so the customer is told once.
        const { data: moved, error: upError } = await db.from("whatsapp_conversations")
            .update({ state, handed_off_at: now.toISOString(), dealt_with_at: null, team_alerted_at: now.toISOString(), team_referred_at: null })
            .eq("id", conversationId).is("handed_off_at", null).select("id");
        if (upError) fail("hand off", upError);
        const did = (moved ?? []).length > 0;
        if (did) await logConversationEvent(conversationId, "handed_off", { reason });
        return did;
    },

    async listPending(now, limit) {
        const { data, error } = await db.from("inbound_events").select("id")
            .is("processed_at", null).is("gave_up_at", null).lt("attempts", MAX_ATTEMPTS)
            .gte("received_at", new Date(now.getTime() - REPROCESS_WINDOW_MS).toISOString())
            .or(`last_attempt_at.is.null,last_attempt_at.lt.${new Date(now.getTime() - RETRY_AFTER_MS).toISOString()}`)
            .order("received_at").limit(limit);
        if (error) fail("list pending", error);
        return (data ?? []).map((r: { id: string }) => r.id);
    },

    async expireStale(now) {
        const { data, error } = await db.from("inbound_events")
            .update({ gave_up_at: now.toISOString(), error: "not processed inside the 20-hour window" })
            .is("processed_at", null).is("gave_up_at", null)
            .lt("received_at", new Date(now.getTime() - REPROCESS_WINDOW_MS).toISOString())
            .select("id");
        if (error) fail("expire stale", error);
        return (data ?? []).length;
    },
};
