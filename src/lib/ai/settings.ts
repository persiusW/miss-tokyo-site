// ai_settings, read with safe defaults. A read failure turns the agents OFF:
// an AI feature that cannot see its kill switch or its spend cap must not run.
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type AiSettings = {
    dailySpendCapGhs: number;
    whatsappEnabled: boolean;
    dashboardAgentEnabled: boolean;
    holdMinutesWhatsapp: number;
    adminCostMarkupPct: number;
};

/** Keys staff may change from the AI Settings page, with their validators. */
export const EDITABLE_AI_SETTINGS = {
    daily_spend_cap_ghs: (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 10_000,
    whatsapp_enabled: (v: unknown) => typeof v === "boolean",
    dashboard_agent_enabled: (v: unknown) => typeof v === "boolean",
    hold_minutes_whatsapp: (v: unknown) => typeof v === "number" && Number.isInteger(v) && v >= 5 && v <= 60,
    admin_cost_markup_pct: (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 500,
} as const;

export type EditableAiSettingKey = keyof typeof EDITABLE_AI_SETTINGS;

/**
 * Settings only the admin role may see or change. Owners manage the rest of
 * the AI settings but never see the dev markup; the ai_settings RLS policy
 * enforces the same rule at the database.
 */
export const ADMIN_ONLY_AI_SETTINGS: ReadonlySet<string> = new Set(["admin_cost_markup_pct"]);

export function visibleAiSettings<T extends { key: string }>(rows: T[], role: string): T[] {
    return role === "admin" ? rows : rows.filter(r => !ADMIN_ONLY_AI_SETTINGS.has(r.key));
}

function envCap(): number {
    const n = Number(process.env.DAILY_AI_SPEND_CAP_GHS);
    return Number.isFinite(n) && n >= 0 ? n : 50;
}

const OFF: AiSettings = {
    dailySpendCapGhs: 0,
    whatsappEnabled: false,
    dashboardAgentEnabled: false,
    holdMinutesWhatsapp: 15,
    adminCostMarkupPct: 0,
};

export async function getAiSettings(): Promise<AiSettings> {
    const { data, error } = await supabaseAdmin.from("ai_settings").select("key, value");
    if (error || !data) {
        console.error("[ai/settings] could not read ai_settings — AI features off", error);
        return OFF;
    }
    const map = new Map(data.map((r: any) => [r.key as string, r.value as unknown]));
    const num = (k: string, d: number) => {
        const v = map.get(k);
        return typeof v === "number" && Number.isFinite(v) ? v : d;
    };
    const bool = (k: string) => map.get(k) === true;
    return {
        dailySpendCapGhs: num("daily_spend_cap_ghs", envCap()),
        whatsappEnabled: bool("whatsapp_enabled"),
        dashboardAgentEnabled: bool("dashboard_agent_enabled"),
        holdMinutesWhatsapp: num("hold_minutes_whatsapp", 15),
        adminCostMarkupPct: num("admin_cost_markup_pct", 0),
    };
}
