// Shared types and helpers for Miss Tokyo AI tools.
import type Anthropic from "@anthropic-ai/sdk";
import { PLACEHOLDER_EMAIL_DOMAIN } from "@/lib/checkout/createCheckoutOrder";
import type { Effect } from "@/lib/ai/missTokyoAi/effects";
import type { MtaiFeatures } from "@/lib/ai/settings";

import type { StaffRole } from "@/lib/ai/missTokyoAi/routes";
export type { StaffRole };

export type ToolContext = {
    userId: string;
    role: StaffRole;
    /** Buttons the reply will carry (Take me there, Show me). Tools push; the UI renders. */
    effects: Effect[];
    /** Which switched extras are on for this turn. */
    features: MtaiFeatures;
};

export type ToolOutcome = { content: string; isError: boolean };

export type ToolDef = {
    def: Anthropic.Tool;
    /** Roles that may see and call the tool. Omitted = every staff role. */
    roles?: StaffRole[];
    /** The switch that must be on for the tool to exist. Omitted = always. */
    feature?: keyof MtaiFeatures;
    run: (input: any, ctx: ToolContext) => Promise<ToolOutcome>;
};

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const ORDER_STATUSES = [
    "pending", "paid", "processing", "packed", "shipped", "ready_for_pickup",
    "fulfilled", "delivered", "refunded", "cancelled", "failed", "reservation_expired",
];

export const ok = (data: unknown): ToolOutcome => ({ content: JSON.stringify(data), isError: false });
export const err = (message: string): ToolOutcome => ({ content: message, isError: true });

export const str = (v: unknown, max = 200): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
export const intIn = (v: unknown, min: number, max: number, dflt: number): number =>
    Number.isInteger(v) && (v as number) >= min && (v as number) <= max ? (v as number) : dflt;

/** Last 9 digits of a Ghana number, or null. */
export function last9(phone: unknown): string | null {
    const digits = String(phone ?? "").replace(/\D/g, "");
    return digits.length >= 9 ? digits.slice(-9) : null;
}

/** Safe for PostgREST .or() / .ilike() values: drops filter syntax and LIKE wildcards. */
export function cleanSearch(v: unknown, max = 60): string {
    return str(v, max).replace(/[%_,()*"\\:]/g, " ").replace(/\s+/g, " ").trim();
}

export const isPlaceholderEmail = (email: string | null | undefined) =>
    !!email && email.toLowerCase().endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`);

export const money = (n: unknown) => parseFloat((Number(n) || 0).toFixed(2));

export { maskGiftCode } from "@/lib/ai/missTokyoAi/scrub";

/** UTC day bounds; Ghana is UTC all year, so these are the shop's days. */
export function dayBounds(date: string): { from: string; to: string } {
    const start = new Date(`${date}T00:00:00.000Z`);
    return { from: start.toISOString(), to: new Date(start.getTime() + 86_400_000).toISOString() };
}

export const todayUtc = () => new Date().toISOString().slice(0, 10);
