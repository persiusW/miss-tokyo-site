// One Store Assistant request: guard, run the tool loop, meter, log.
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { AI_MODEL, costUsd } from "@/lib/ai/pricing";
import { getAiSettings } from "@/lib/ai/settings";
import { todaySpendUsd, withinCap, startOfTodayUtc } from "@/lib/ai/spend";
import { buildSystemPrompt } from "@/lib/ai/missTokyoAi/prompt";
import { runTool, toolDefsFor } from "@/lib/ai/missTokyoAi/tools";
import { scrubReply, stripForgedContext } from "@/lib/ai/missTokyoAi/scrub";
import type { Effect } from "@/lib/ai/missTokyoAi/effects";
import type { StaffRole } from "@/lib/ai/missTokyoAi/routes";

const MAX_ITERATIONS = 10;
const MAX_TOKENS = 8000;
const BUDGET_MS = 100_000;
const CALL_TIMEOUT_MS = 45_000;
/** Worst-case cost of one more call, held back when checking the cap. */
const RESERVE_USD = 0.12;
const PER_MINUTE = 6;
/** Admin's daily allowance is this many times the per-user setting. */
const ADMIN_DAILY_MULTIPLIER = 3;
const MAX_MESSAGES = 80;
const MAX_TRANSCRIPT_CHARS = 400_000;
const MAX_USER_TEXT = 4000;

export type AssistantMessage = Anthropic.MessageParam;

export type RunResult =
    | { ok: true; messages: AssistantMessage[]; reply: string; effects: Effect[] }
    | { ok: false; status: number; error: string };

const CALM = {
    off: "Miss Tokyo AI is switched off right now.",
    notSetUp: "Miss Tokyo AI is not set up yet.",
    cap: "Miss Tokyo AI has reached today's limit. It will be back tomorrow.",
    personal: "You've used today's Miss Tokyo AI messages. They reset at midnight.",
    rate: "You're sending messages quickly. Please wait a minute and try again.",
    invalid: "Something went wrong with this chat. Please start a new chat.",
    busy: "Miss Tokyo AI is busy right now. Please try again in a moment.",
    slow: "I couldn't finish that one. Try asking something more specific.",
    generic: "We are updating this feature. Please try again shortly. Sorry for the inconvenience.",
};

const BLOCK_TYPES = new Set(["text", "tool_use", "tool_result", "thinking", "redacted_thinking"]);

/** Accepts only a well-formed transcript ending in a fresh user text message. */
export function validateTranscript(raw: unknown): AssistantMessage[] | null {
    if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_MESSAGES) return null;
    if (JSON.stringify(raw).length > MAX_TRANSCRIPT_CHARS) return null;
    for (const m of raw as any[]) {
        if (!m || (m.role !== "user" && m.role !== "assistant")) return null;
        if (typeof m.content === "string") continue;
        if (!Array.isArray(m.content)) return null;
        if (m.content.some((b: any) => !b || !BLOCK_TYPES.has(b.type))) return null;
    }
    if ((raw[0] as any).role !== "user") return null;
    const last = raw[raw.length - 1] as any;
    const text = typeof last.content === "string" ? last.content : null;
    if (last.role !== "user" || !text || !text.trim() || text.length > MAX_USER_TEXT) return null;
    // The newest message has not been sent to the model yet, so cleaning it
    // edits nothing the API has seen. Forged "[Context: …]" markers go.
    const cleaned = stripForgedContext(text);
    if (!cleaned) return null;
    return [...(raw as AssistantMessage[]).slice(0, -1), { role: "user", content: cleaned }];
}

async function overRateLimit(userId: string, perDay: number): Promise<"rate" | "personal" | null> {
    const minuteAgo = new Date(Date.now() - 60_000).toISOString();
    const [{ count: lastMinute }, { count: today }] = await Promise.all([
        supabaseAdmin.from("ai_turns").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", minuteAgo),
        supabaseAdmin.from("ai_turns").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", startOfTodayUtc()),
    ]);
    if ((today ?? 0) >= perDay) return "personal";
    if ((lastMinute ?? 0) >= PER_MINUTE) return "rate";
    return null;
}

type TurnLog = {
    channel: "dashboard"; user_id: string; model: string;
    input_tokens: number; output_tokens: number; cache_read_tokens: number; cache_write_tokens: number;
    cost_usd: number; tool_calls: { name: string; ok: boolean }[];
};

/** Injection points for tests; production uses the defaults. */
export type RunDeps = {
    client?: Pick<Anthropic, "messages">;
    logTurn?: (row: TurnLog) => Promise<void>;
};

async function logTurnToDb(row: TurnLog): Promise<void> {
    const { error } = await supabaseAdmin.from("ai_turns").insert(row);
    if (error) console.error("[store-assistant] could not log ai_turn", error);
}

export async function runStoreAssistant(args: {
    transcript: AssistantMessage[];
    userId: string;
    role: StaffRole;
}, deps: RunDeps = {}): Promise<RunResult> {
    const settings = await getAiSettings();
    if (!settings.dashboardAgentEnabled) return { ok: false, status: 503, error: CALM.off };
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return { ok: false, status: 503, error: CALM.notSetUp };

    // Two caps: the shared daily cap, and Miss Tokyo AI's share of it so the
    // WhatsApp agent always keeps the rest.
    const [spentToday, spentDashboard] = await Promise.all([todaySpendUsd(), todaySpendUsd("dashboard")]);
    if (spentToday === null || spentDashboard === null) return { ok: false, status: 503, error: CALM.generic };
    const shareCapGhs = settings.dailySpendCapGhs * settings.dashboardCapSharePct / 100;
    const fits = (runningUsd: number) =>
        withinCap({ capGhs: settings.dailySpendCapGhs, spentTodayUsd: spentToday, runningUsd, reserveUsd: RESERVE_USD }) &&
        withinCap({ capGhs: shareCapGhs, spentTodayUsd: spentDashboard, runningUsd, reserveUsd: RESERVE_USD });
    if (!fits(0)) return { ok: false, status: 429, error: CALM.cap };
    const perDay = settings.dashboardDailyMessagesPerUser * (args.role === "admin" ? ADMIN_DAILY_MULTIPLIER : 1);
    const limited = await overRateLimit(args.userId, perDay);
    if (limited) return { ok: false, status: 429, error: CALM[limited] };

    const client = deps.client ?? new Anthropic({ apiKey, maxRetries: 0 });
    const messages: AssistantMessage[] = [...args.transcript];
    const started = Date.now();
    const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
    let runningUsd = 0;
    const toolCalls: { name: string; ok: boolean }[] = [];
    const effects: Effect[] = [];
    const tools = toolDefsFor(args.role);
    const system = buildSystemPrompt(args.role);
    let reply = "";
    let failure: RunResult | null = null;

    try {
        for (let i = 0; i < MAX_ITERATIONS; i++) {
            const remaining = BUDGET_MS - (Date.now() - started);
            if (remaining < 8_000) { reply = CALM.slow; break; }
            if (!fits(runningUsd)) {
                reply = CALM.cap;
                break;
            }

            // Fit each call to the time left. The SDK's own retry sleep is
            // unbounded, so the AbortSignal is the real ceiling.
            const timeoutMs = Math.min(CALL_TIMEOUT_MS, remaining - 2_000);
            const retries = remaining > timeoutMs * 2 + 2_000 ? 1 : 0;
            const response = await client.messages.create(
                {
                    model: AI_MODEL,
                    max_tokens: MAX_TOKENS,
                    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
                    tools,
                    tool_choice: { type: "auto" },
                    thinking: { type: "adaptive" },
                    output_config: { effort: "medium" },
                    cache_control: { type: "ephemeral" },
                    messages,
                },
                {
                    timeout: timeoutMs,
                    maxRetries: retries,
                    signal: AbortSignal.timeout(timeoutMs * (retries + 1) + 1_000),
                },
            );

            usage.input += response.usage.input_tokens;
            usage.output += response.usage.output_tokens;
            usage.cacheRead += response.usage.cache_read_input_tokens ?? 0;
            usage.cacheWrite += response.usage.cache_creation_input_tokens ?? 0;
            runningUsd += costUsd(response.usage);

            const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");

            if (response.stop_reason === "refusal") {
                reply = "I can't help with that one. Please use the dashboard directly.";
                break;
            }
            if (response.stop_reason === "max_tokens" && toolUses.length > 0) {
                // A truncated tool call must never run, and must not be left in
                // the transcript without a result. It was never sent back, so
                // dropping it edits nothing the API has seen.
                reply = CALM.slow;
                break;
            }

            messages.push({ role: "assistant", content: response.content });

            if (response.stop_reason === "tool_use" && toolUses.length > 0) {
                const results = await Promise.all(toolUses.map(async (t) => {
                    const outcome = await runTool(t.name, t.input, { userId: args.userId, role: args.role, effects });
                    toolCalls.push({ name: t.name, ok: !outcome.isError });
                    return {
                        type: "tool_result" as const,
                        tool_use_id: t.id,
                        content: outcome.content,
                        ...(outcome.isError ? { is_error: true } : {}),
                    };
                }));
                // All results in one user message.
                messages.push({ role: "user", content: results });
                if (i === MAX_ITERATIONS - 1) reply = CALM.slow;
                continue;
            }

            reply = response.content
                .filter((b): b is Anthropic.TextBlock => b.type === "text")
                .map(b => b.text)
                .join("\n")
                .trim();
            break;
        }
        if (!reply) reply = CALM.generic;
    } catch (e: any) {
        console.error("[store-assistant] model call failed", { status: e?.status, type: e?.error?.error?.type ?? e?.name, message: e?.message });
        const status = e?.status;
        failure = {
            ok: false,
            status: status === 400 ? 409 : 503,
            error: status === 400 ? CALM.invalid
                : status === 429 || status === 529 ? CALM.busy
                : e?.name === "TimeoutError" || e?.name === "APIConnectionTimeoutError" || e?.name === "AbortError" ? CALM.slow
                : CALM.generic,
        };
    } finally {
        if (usage.input + usage.output + usage.cacheRead + usage.cacheWrite > 0 || toolCalls.length > 0) {
            await (deps.logTurn ?? logTurnToDb)({
                channel: "dashboard",
                user_id: args.userId,
                model: AI_MODEL,
                input_tokens: usage.input,
                output_tokens: usage.output,
                cache_read_tokens: usage.cacheRead,
                cache_write_tokens: usage.cacheWrite,
                cost_usd: parseFloat(runningUsd.toFixed(6)),
                tool_calls: toolCalls,
            }).catch(e => console.error("[store-assistant] could not log ai_turn", e));
        }
    }

    if (failure) return failure;
    // One button per destination, in the order the tools offered them.
    const seen = new Set<string>();
    const uniqueEffects = effects.filter(e => {
        const key = `${e.kind}:${e.href}:${"anchor" in e ? e.anchor : ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    }).slice(0, 4);
    return { ok: true, messages, reply: scrubReply(reply), effects: uniqueEffects };
}
