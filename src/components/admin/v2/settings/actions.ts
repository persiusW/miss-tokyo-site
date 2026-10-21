"use server";

// Settings server actions. Server actions are public endpoints that run on the
// service role, so each one checks the caller's role itself; the page hiding a
// control gates nothing.
import { after } from "next/server";
import { revalidatePath, updateTag } from "next/cache";
import { NAV_TAG } from "@/lib/content/shopNav";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logActivity } from "@/lib/utils/logActivity";
import { logCause } from "@/lib/errors/apiError";
import { clearV2FlagCache } from "@/lib/admin/v2/flags";
import { ADMIN_ONLY_AI_SETTINGS, EDITABLE_AI_SETTINGS } from "@/lib/ai/settings";
import { STATUS_TEMPLATE_EVENTS, templateIdValue } from "@/lib/ai/templateSettings";
import { encodeSection, type AiValidators } from "./codec";
import { loadSavedValues } from "./load";
import { MESSAGE_EVENTS } from "./messages";
import type { Values } from "./schema";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const SAVE_FAILED = "We couldn't save those changes. Nothing was changed. Please try again.";

async function caller(roles: string[]): Promise<{ userId: string; role: "admin" | "owner" | "sales_staff"; email: string } | null> {
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
    const role = profile?.role as "admin" | "owner" | "sales_staff" | undefined;
    if (!role || !roles.includes(role)) return null;
    return { userId: user.id, role, email: user.email ?? "" };
}

const DENIED = { ok: false as const, error: "Only owners and admins can change settings. Ask the owner if you need something changed." };

/** Save one section's changes in one transaction (fn_settings_save). */
export async function saveSettingsSection(section: string, changes: Values): Promise<Result<{ saved: number }>> {
    const me = await caller(["admin", "owner"]);
    if (!me) return DENIED;
    if (!changes || typeof changes !== "object" || Array.isArray(changes)) return { ok: false, error: SAVE_FAILED };

    let current: Values;
    try {
        current = (await loadSavedValues(me.role)).saved;
    } catch (e) {
        logCause("GEN-00", e, { where: "settings.save.load", section });
        return { ok: false, error: SAVE_FAILED };
    }

    // The admin-only markup is withheld from everyone else, on the server too.
    const validators: AiValidators = Object.fromEntries(
        Object.entries(EDITABLE_AI_SETTINGS).filter(([k]) => me.role === "admin" || !ADMIN_ONLY_AI_SETTINGS.has(k)),
    );
    const enc = encodeSection(section, changes, current, me.role, validators);
    if (!enc.ok) return enc;

    const { error } = await supabaseAdmin.rpc("fn_settings_save", { p_payload: enc.payload, p_actor: me.userId });
    if (error) {
        logCause("GEN-00", error, { where: "settings.save", section, keys: enc.keys });
        return { ok: false, error: SAVE_FAILED };
    }
    if (section === "rollout") clearV2FlagCache();
    // The shop menu hides Gallery and Gift cards when their page is off.
    if (enc.keys.some(k => k === "store.enable_gallery" || k === "store.enable_gift_cards")) updateTag(NAV_TAG);
    after(() => logActivity({
        userId: me.userId, userRole: me.role, actionType: "UPDATE", resource: "settings", resourceId: section,
        details: { section, changed: enc.keys },
    }));
    revalidatePath("/settings", "layout");
    return { ok: true, saved: enc.keys.length };
}

/** One customer message: its email and SMS wording and its WhatsApp template id, together. */
export async function saveMessage(input: {
    event: string;
    email?: { subject: string; greeting: string; body_text: string };
    sms?: { greeting: string; body_text: string };
    waTemplateId?: string;
}): Promise<Result> {
    const me = await caller(["admin", "owner"]);
    if (!me) return DENIED;
    const def = MESSAGE_EVENTS.find(m => m.key === input?.event);
    if (!def) return { ok: false, error: SAVE_FAILED };

    const templates: Record<string, unknown>[] = [];
    if (input.email && def.email) {
        const { subject, greeting, body_text } = input.email;
        if ([subject, greeting, body_text].some(x => typeof x !== "string" || x.length > 5000)) return { ok: false, error: "That message is too long." };
        templates.push({ channel: "email", event_type: def.email, subject: subject.trim(), greeting: greeting.trim(), body_text });
    }
    if (input.sms && def.sms) {
        const { greeting, body_text } = input.sms;
        if ([greeting, body_text].some(x => typeof x !== "string" || x.length > 1000)) return { ok: false, error: "That SMS is too long." };
        templates.push({ channel: "sms", event_type: def.sms, subject: null, greeting: greeting.trim(), body_text });
    }
    const payload: Record<string, unknown> = {};
    if (templates.length) payload.templates = templates;

    if (input.waTemplateId !== undefined && def.wa) {
        const id = String(input.waTemplateId).trim();
        if (!templateIdValue(id)) return { ok: false, error: "The WhatsApp template id is the number shown in Chatbots Africa's Message Templates." };
        const { data: row, error } = await supabaseAdmin.from("ai_settings").select("value").eq("key", "whatsapp_status_template_ids").maybeSingle();
        if (error || !row) {
            logCause("GEN-00", error ?? "missing whatsapp_status_template_ids", { where: "settings.message.wa" });
            return { ok: false, error: SAVE_FAILED };
        }
        const cur = (row.value && typeof row.value === "object" ? row.value : {}) as Record<string, unknown>;
        const next = Object.fromEntries(STATUS_TEMPLATE_EVENTS.map(e => [e, String(cur[e] ?? "")]));
        next[def.wa] = id;
        if (!EDITABLE_AI_SETTINGS.whatsapp_status_template_ids(next)) return { ok: false, error: SAVE_FAILED };
        payload.ai = [{ key: "whatsapp_status_template_ids", value: next }];
    }
    if (!Object.keys(payload).length) return { ok: false, error: "There's nothing to save." };

    const { error } = await supabaseAdmin.rpc("fn_settings_save", { p_payload: payload, p_actor: me.userId });
    if (error) {
        logCause("GEN-00", error, { where: "settings.message", event: def.key });
        return { ok: false, error: SAVE_FAILED };
    }
    after(() => logActivity({
        userId: me.userId, userRole: me.role, actionType: "UPDATE", resource: "settings", resourceId: "notifications",
        details: { section: "notifications", message: def.key },
    }));
    revalidatePath("/settings", "layout");
    return { ok: true };
}

// ── Riders (saved straight away, as on the old Riders tab) ──────────────────

type RiderInput = { full_name: string; phone_number: string; bike_reg?: string; image_url?: string };

function cleanRider(r: RiderInput): { ok: true; row: Record<string, unknown> } | { ok: false; error: string } {
    const name = String(r?.full_name ?? "").trim(), phone = String(r?.phone_number ?? "").trim();
    if (!name) return { ok: false, error: "Enter the rider's name." };
    if (phone.replace(/\D/g, "").length < 9) return { ok: false, error: "Enter the rider's phone number." };
    if (name.length > 120 || phone.length > 30) return { ok: false, error: "That name or number is too long." };
    const bike = String(r?.bike_reg ?? "").trim(), img = String(r?.image_url ?? "").trim();
    if (img && !/^https:\/\//.test(img)) return { ok: false, error: "That photo didn't upload. Please try again." };
    return { ok: true, row: { full_name: name, phone_number: phone, bike_reg: bike || null, image_url: img || null } };
}

export async function addRider(input: RiderInput): Promise<Result<{ id: string }>> {
    const me = await caller(["admin", "owner"]);
    if (!me) return DENIED;
    const c = cleanRider(input);
    if (!c.ok) return c;
    const { data, error } = await supabaseAdmin.from("riders").insert({ ...c.row, is_active: true }).select("id").single();
    if (error || !data) { logCause("GEN-00", error, { where: "settings.rider.add" }); return { ok: false, error: "We couldn't add that rider. Please try again." }; }
    after(() => logActivity({ userId: me.userId, userRole: me.role, actionType: "CREATE", resource: "rider", resourceId: String(data.id), details: { name: c.row.full_name } }));
    revalidatePath("/settings", "layout");
    return { ok: true, id: String(data.id) };
}

export async function updateRider(id: string, input: RiderInput): Promise<Result> {
    const me = await caller(["admin", "owner"]);
    if (!me) return DENIED;
    const c = cleanRider(input);
    if (!c.ok) return c;
    const { data, error } = await supabaseAdmin.from("riders").update(c.row).eq("id", id).select("id");
    if (error || !data?.length) { logCause("GEN-00", error, { where: "settings.rider.update" }); return { ok: false, error: "We couldn't save that rider. Please try again." }; }
    after(() => logActivity({ userId: me.userId, userRole: me.role, actionType: "UPDATE", resource: "rider", resourceId: id, details: { name: c.row.full_name } }));
    revalidatePath("/settings", "layout");
    return { ok: true };
}

export async function setRiderActive(id: string, active: boolean): Promise<Result> {
    const me = await caller(["admin", "owner"]);
    if (!me) return DENIED;
    const { data, error } = await supabaseAdmin.from("riders").update({ is_active: active === true }).eq("id", id).select("id, full_name");
    if (error || !data?.length) { logCause("GEN-00", error, { where: "settings.rider.active" }); return { ok: false, error: "We couldn't change that rider. Please try again." }; }
    after(() => logActivity({ userId: me.userId, userRole: me.role, actionType: "UPDATE", resource: "rider", resourceId: id, details: { name: data[0].full_name, is_active: active === true } }));
    revalidatePath("/settings", "layout");
    return { ok: true };
}

export async function deleteRider(id: string): Promise<Result> {
    const me = await caller(["admin", "owner"]);
    if (!me) return DENIED;
    const { data, error } = await supabaseAdmin.from("riders").delete().eq("id", id).select("id, full_name");
    if (error?.code === "23503") return { ok: false, error: "This rider is on past orders, so they can't be deleted. Turn them off instead." };
    if (error || !data?.length) { logCause("GEN-00", error, { where: "settings.rider.delete" }); return { ok: false, error: "We couldn't delete that rider. Please try again." }; }
    after(() => logActivity({ userId: me.userId, userRole: me.role, actionType: "DELETE", resource: "rider", resourceId: id, details: { name: data[0].full_name } }));
    revalidatePath("/settings", "layout");
    return { ok: true };
}

// ── Your account (any staff role, their own sign-in only) ────────────────────

export async function updateMyName(name: string): Promise<Result> {
    const me = await caller(["admin", "owner", "sales_staff"]);
    if (!me) return { ok: false, error: "Please sign in again." };
    const n = String(name ?? "").trim().replace(/\s+/g, " ");
    if (!n) return { ok: false, error: "Enter your name." };
    if (n.length > 80) return { ok: false, error: "Keep your name to 80 characters." };
    const parts = n.split(" ");
    const { error } = await supabaseAdmin.from("profiles").update({ full_name: n, first_name: parts[0], last_name: parts.slice(1).join(" ") || null }).eq("id", me.userId);
    if (error) { logCause("GEN-00", error, { where: "settings.account.name" }); return { ok: false, error: "We couldn't save your name. Please try again." }; }
    // The top bar reads the name from the sign-in token, so keep it in step.
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(me.userId, { user_metadata: { full_name: n } });
    if (authErr) logCause("GEN-00", authErr, { where: "settings.account.name.metadata" });
    return { ok: true };
}

export type MySession = { id: string; created_at: string; last_active_at: string; user_agent: string | null; aal: string | null };

export async function listMySessions(): Promise<Result<{ sessions: MySession[]; currentId: string | null }>> {
    const me = await caller(["admin", "owner", "sales_staff"]);
    if (!me) return { ok: false, error: "Please sign in again." };
    const [{ data, error }, claims] = await Promise.all([
        supabaseAdmin.rpc("fn_my_auth_sessions", { p_user: me.userId }),
        (await createClient()).auth.getClaims().catch(() => null),
    ]);
    if (error) { logCause("GEN-00", error, { where: "settings.account.sessions" }); return { ok: false, error: "We couldn't load where you're signed in." }; }
    const sid = (claims?.data?.claims as { session_id?: string } | undefined)?.session_id ?? null;
    return { ok: true, sessions: (data ?? []) as MySession[], currentId: sid };
}
