// Server-only: everything the Settings pages read, in one place. Uses the
// service role (pages on the anon client go silently empty after the RLS
// lockdown); every caller has checked the role first.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { v2AreaOn } from "@/lib/admin/v2/server";
import { visibleAiSettings } from "@/lib/ai/settings";
import { USD_TO_GHS } from "@/lib/ai/pricing";
import { todaySpendUsd } from "@/lib/ai/spend";
import { getAiSettings } from "@/lib/ai/settings";
import { decodeValues } from "./codec";
import { monthRangeUtc, monthUse } from "./aiUse";
import type { Ctx, Values } from "./schema";

export type Rider = { id: string; full_name: string; phone_number: string; bike_reg: string | null; image_url: string | null; is_active: boolean };
export type Template = { channel: "email" | "sms"; event_type: string; subject: string | null; greeting: string | null; body_text: string };
export type Turn = { created_at: string; channel: string; model: string | null; input_tokens: number | null; output_tokens: number | null; cost_ghs: number };
export type AiActivity = {
    todayGhs: number | null; capGhs: number;
    month: { label: string; turns: number; ghs: number; withMarkupGhs: number | null } | null;
    recent: Turn[];
};

export type SettingsData = {
    saved: Values;
    /** Keys of ai_settings rows that exist; rows for missing keys are hidden. */
    aiKeys: string[];
    ctx: Ctx;
    categories: { id: string; name: string }[];
    riders: Rider[];
    templates: Template[];
};

function siteDomain(): string {
    try { return new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://misstokyo.shop").host; } catch { return "misstokyo.shop"; }
}

/** The saved values only (for the save action's cross-field checks). */
export async function loadSavedValues(role: string): Promise<{ saved: Values; aiKeys: string[] }> {
    const [store, biz, site, push, meta, ai, cats] = await Promise.all([
        supabaseAdmin.from("store_settings").select("*").eq("id", "default").maybeSingle(),
        supabaseAdmin.from("business_settings").select("*").eq("id", "default").maybeSingle(),
        supabaseAdmin.from("site_settings").select("*").eq("id", "singleton").maybeSingle(),
        supabaseAdmin.from("push_notification_settings").select("title, body").eq("id", "default").maybeSingle(),
        supabaseAdmin.from("site_metadata").select("title, description, keywords").eq("page_path", "/").maybeSingle(),
        supabaseAdmin.from("ai_settings").select("key, value"),
        supabaseAdmin.from("categories").select("id").eq("is_active", true).eq("is_wholesale", true),
    ]);
    const failed = [store, biz, site, ai].find(r => r.error);
    if (failed?.error) throw failed.error;
    const aiRows = visibleAiSettings((ai.data ?? []) as { key: string; value: unknown }[], role);
    const saved = decodeValues({
        store: store.data, biz: biz.data, site: site.data, push: push.data, meta: meta.data,
        ai: aiRows, wholesaleCats: (cats.data ?? []).map(c => String(c.id)),
    });
    return { saved, aiKeys: aiRows.map(r => r.key) };
}

export async function loadSettingsData(role: Ctx["role"], me: { name: string; email: string }): Promise<SettingsData> {
    const [{ saved, aiKeys }, cats, riders, staff, templates, staffOn, billingOn, contentOn] = await Promise.all([
        loadSavedValues(role),
        supabaseAdmin.from("categories").select("id, name").eq("is_active", true).order("name"),
        supabaseAdmin.from("riders").select("id, full_name, phone_number, bike_reg, image_url, is_active").order("full_name"),
        supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).in("role", ["owner", "admin", "sales_staff"]),
        supabaseAdmin.from("communication_templates").select("channel, event_type, subject, greeting, body_text"),
        v2AreaOn("staff"), v2AreaOn("billing"), v2AreaOn("content"),
    ]);
    const rs = (riders.data ?? []) as Rider[];
    return {
        saved, aiKeys,
        categories: (cats.data ?? []).map(c => ({ id: String(c.id), name: String(c.name) })),
        riders: rs,
        templates: (templates.data ?? []) as Template[],
        ctx: {
            role, me,
            domain: siteDomain(),
            paystackConnected: !!process.env.PAYSTACK_SECRET_KEY,
            riders: { total: rs.length, active: rs.filter(r => r.is_active).length },
            staffCount: staff.count ?? 0,
            staffHref: staffOn ? "/staff" : "/team",
            billingHref: billingOn ? "/billing" : null,
            contentOn,
        },
    };
}

const toGhs = (usd: number) => Math.round(usd * USD_TO_GHS * 100) / 100;

/** Today's spend, this month's use (gap 19) and the last 20 turns, for Assistants. */
export async function loadAiActivity(role: Ctx["role"], markupPct: number | null): Promise<AiActivity> {
    const range = monthRangeUtc(new Date());
    const [today, settings, month, recent] = await Promise.all([
        todaySpendUsd(),
        getAiSettings(),
        supabaseAdmin.rpc("fn_ai_cost_between", { p_from: range.from, p_to: range.to }),
        supabaseAdmin.from("ai_turns").select("created_at, channel, model, input_tokens, output_tokens, cost_usd")
            .order("created_at", { ascending: false }).limit(20),
    ]);
    const row = Array.isArray(month.data) ? month.data[0] : month.data;
    const use = month.error || !row ? null : monthUse(Number(row.cost_usd) || 0, Number(row.turns) || 0, role === "admin" ? markupPct : null);
    if (month.error) console.error("[settings] month AI use", month.error.message);
    return {
        todayGhs: today === null ? null : toGhs(today),
        capGhs: settings.dailySpendCapGhs,
        month: use ? { label: range.label, ...use } : null,
        recent: ((recent.data ?? []) as Record<string, unknown>[]).map(t => ({
            created_at: String(t.created_at), channel: String(t.channel ?? ""), model: (t.model as string | null) ?? null,
            input_tokens: (t.input_tokens as number | null) ?? null, output_tokens: (t.output_tokens as number | null) ?? null,
            cost_ghs: toGhs(Number(t.cost_usd) || 0),
        })),
    };
}
