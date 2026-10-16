// ai_settings, read with safe defaults. A read failure turns the agents OFF:
// an AI feature that cannot see its kill switch or its spend cap must not run.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normaliseWaNumber, SHOP_SETTING_VALIDATORS } from "@/lib/ai/shopAssistant/settingsRules";

export type AiSettings = {
    dailySpendCapGhs: number;
    whatsappEnabled: boolean;
    /** Our WhatsApp phone_number_id, for the soft check on callbacks. Null skips it. */
    whatsappPhoneNumberId: string | null;
    /** Where a WhatsApp chat is forwarded when it goes to a person (233…). Null = the shop's WhatsApp number. */
    whatsappHandoffNumber: string | null;
    /** Order updates on WhatsApp (also needs whatsapp_enabled). */
    whatsappStatusNotifications: boolean;
    /** Approved Chatbots Africa template id for updates outside the 24h window; null = text inside the window only. */
    whatsappStatusTemplateId: number | null;
    dashboardAgentEnabled: boolean;
    holdMinutesWhatsapp: number;
    adminCostMarkupPct: number;
    /** Share of the daily cap Miss Tokyo AI may use; the rest stays free for WhatsApp. */
    dashboardCapSharePct: number;
    /** Messages per staff member or owner per day; admin gets 3×. */
    dashboardDailyMessagesPerUser: number;
    /** Miss Tokyo AI extras; each defaults off. */
    mtai: MtaiFeatures;
    /** Ask Miss Tokyo, the customer chat on the shop. */
    shop: ShopSettings;
};

export type ShopSettings = {
    enabled: boolean;
    dailyMessagesPerVisitor: number;
    /** Share of the daily cap the shop chat may use. */
    capSharePct: number;
    /** 233XXXXXXXXX, or null to fall back to the store phone. */
    whatsappNumber: string | null;
};

export type MtaiFeatures = {
    sendToAdmin: boolean;
    bell: boolean;
    walkthroughs: boolean;
    voice: boolean;
    /** Ask Miss Tokyo AI on payment error toasts (spec B Part 5). */
    errorHelp: boolean;
};

export const MTAI_FEATURES_OFF: MtaiFeatures = { sendToAdmin: false, bell: false, walkthroughs: false, voice: false, errorHelp: false };

/** Keys staff may change from the AI Settings page, with their validators. */
export const EDITABLE_AI_SETTINGS = {
    daily_spend_cap_ghs: (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 10_000,
    whatsapp_enabled: (v: unknown) => typeof v === "boolean",
    dashboard_agent_enabled: (v: unknown) => typeof v === "boolean",
    hold_minutes_whatsapp: (v: unknown) => typeof v === "number" && Number.isInteger(v) && v >= 5 && v <= 60,
    admin_cost_markup_pct: (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 500,
    mtai_send_to_admin_enabled: (v: unknown) => typeof v === "boolean",
    mtai_bell_enabled: (v: unknown) => typeof v === "boolean",
    mtai_walkthroughs_enabled: (v: unknown) => typeof v === "boolean",
    mtai_voice_enabled: (v: unknown) => typeof v === "boolean",
    mtai_error_help_enabled: (v: unknown) => typeof v === "boolean",
    mtai_error_log_enabled: (v: unknown) => typeof v === "boolean",
    ...SHOP_SETTING_VALIDATORS,
    /** Where WhatsApp chats are forwarded when they go to a person; "" = the shop's WhatsApp number. */
    whatsapp_handoff_number: SHOP_SETTING_VALIDATORS.shop_whatsapp_number,
    whatsapp_status_notifications: (v: unknown) => typeof v === "boolean",
    /** "" or the approved template's numeric id. */
    // Meta template ids run to 16 digits (e.g. 1072346328969350); they must stay exact as a number.
    whatsapp_status_template_id: (v: unknown) => v === "" || (typeof v === "string" && /^\d{1,16}$/.test(v) && Number.isSafeInteger(Number(v))),
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
    whatsappPhoneNumberId: null,
    whatsappHandoffNumber: null,
    whatsappStatusNotifications: false,
    whatsappStatusTemplateId: null,
    dashboardAgentEnabled: false,
    holdMinutesWhatsapp: 15,
    adminCostMarkupPct: 0,
    dashboardCapSharePct: 0,
    dashboardDailyMessagesPerUser: 0,
    mtai: MTAI_FEATURES_OFF,
    shop: { enabled: false, dailyMessagesPerVisitor: 0, capSharePct: 0, whatsappNumber: null },
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
        whatsappPhoneNumberId: typeof map.get("whatsapp_phone_number_id") === "string" && /^\d{6,30}$/.test(map.get("whatsapp_phone_number_id") as string)
            ? map.get("whatsapp_phone_number_id") as string : null,
        whatsappHandoffNumber: normaliseWaNumber(map.get("whatsapp_handoff_number")),
        whatsappStatusNotifications: bool("whatsapp_status_notifications"),
        whatsappStatusTemplateId: (() => {
            const v = Number(map.get("whatsapp_status_template_id"));
            return Number.isSafeInteger(v) && v > 0 ? v : null;
        })(),
        dashboardAgentEnabled: bool("dashboard_agent_enabled"),
        holdMinutesWhatsapp: num("hold_minutes_whatsapp", 15),
        adminCostMarkupPct: num("admin_cost_markup_pct", 0),
        dashboardCapSharePct: Math.min(100, Math.max(0, num("dashboard_cap_share_pct", 60))),
        dashboardDailyMessagesPerUser: Math.max(0, num("dashboard_daily_messages_per_user", 100)),
        mtai: {
            sendToAdmin: bool("mtai_send_to_admin_enabled"),
            bell: bool("mtai_bell_enabled"),
            walkthroughs: bool("mtai_walkthroughs_enabled"),
            voice: bool("mtai_voice_enabled"),
            errorHelp: bool("mtai_error_help_enabled"),
        },
        shop: {
            enabled: bool("shop_assistant_enabled"),
            dailyMessagesPerVisitor: Math.max(0, num("shop_assistant_daily_messages_per_visitor", 20)),
            capSharePct: Math.min(100, Math.max(0, num("shop_assistant_cap_share_pct", 40))),
            whatsappNumber: normaliseWaNumber(map.get("shop_whatsapp_number")),
        },
    };
}
