// Send to admin: pure helpers shared by the API routes and tests.
import { redactText } from "@/lib/ai/missTokyoAi/scrub";

export const QUESTIONS_PER_DAY = 10;
export const MAX_QUESTION = 300;
export const MAX_ANSWER = 4000;
export const MAX_TITLE = 160;
const EXCERPT_TURNS = 6;
const EXCERPT_CHARS = 600;

export type ExcerptLine = { role: "user" | "assistant"; text: string };

/** The last few text turns of a chat, redacted, for the admin to read. Tool calls and results are left out. */
export function buildExcerpt(transcript: unknown): ExcerptLine[] {
    if (!Array.isArray(transcript)) return [];
    const lines: ExcerptLine[] = [];
    for (const m of transcript.slice(-40)) {
        if (!m || (m.role !== "user" && m.role !== "assistant")) continue;
        const text = typeof m.content === "string"
            ? m.content
            : Array.isArray(m.content)
                ? m.content.filter((b: any) => b?.type === "text" && typeof b.text === "string").map((b: any) => b.text).join("\n")
                : "";
        const clean = redactText(text.trim()).slice(0, EXCERPT_CHARS);
        if (clean) lines.push({ role: m.role, text: clean });
    }
    return lines.slice(-EXCERPT_TURNS);
}

/** Trimmed, single-spaced, capped; empty when nothing usable is left. */
export function cleanQuestion(v: unknown, max = MAX_QUESTION): string {
    return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/** Only dashboard paths, so the inbox never links somewhere odd. */
export function cleanPagePath(v: unknown): string | null {
    return typeof v === "string" && /^\/[a-z0-9/_-]{0,120}$/i.test(v) ? v : null;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const SAVED_ANSWER_ROLES = ["admin", "owner", "sales_staff"] as const;

/** Roles a saved answer is shown to; defaults to everyone. */
export function cleanRoles(v: unknown): string[] {
    if (!Array.isArray(v)) return [...SAVED_ANSWER_ROLES];
    const roles = SAVED_ANSWER_ROLES.filter(r => v.includes(r));
    return roles.length ? roles : [...SAVED_ANSWER_ROLES];
}
