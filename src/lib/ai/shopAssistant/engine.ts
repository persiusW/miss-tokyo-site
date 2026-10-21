// The shop assistant's model loop. Pure: the model client, the tools and the
// spend check are injected, so it is unit-tested with a fake client.
import Anthropic from "@anthropic-ai/sdk";
import { costUsd } from "@/lib/ai/pricing";
import { CUSTOMER_TOOL_NAMES, END_TURN_TOOL_NAMES, OPTIONAL_TOOL_NAMES } from "./toolDefs";
import { LINES, safeReply } from "./lines";

const MAX_ITERATIONS = 8;
const MAX_TOKENS = 8000;
const BUDGET_MS = 70_000;
const CALL_TIMEOUT_MS = 40_000;
/** Waits before retrying a call Claude turned away (busy, rate-limited, a dropped connection). */
export const RETRY_WAITS_MS = [1_500, 4_000];
/** A retry only starts with at least this much of the turn's budget left. */
const RETRY_MIN_LEFT_MS = 15_000;

/** Worth another try: rate-limited (429), overloaded or a server error (5xx, 529), or the connection dropped. */
export function retryable(e: unknown): boolean {
    if (e instanceof Anthropic.RateLimitError || e instanceof Anthropic.InternalServerError) return true;
    if (e instanceof Anthropic.APIConnectionError && !(e instanceof Anthropic.APIUserAbortError)) return true;
    return e instanceof Anthropic.APIError && typeof e.status === "number" && (e.status === 429 || e.status >= 500);
}

type Msg = Anthropic.MessageParam;
export type EngineDeps = {
    client: Pick<Anthropic, "messages">;
    /** endTurn: the tool sent the customer a message itself (offer_choices); this text closes the turn in the transcript. */
    runTool: (name: string, input: unknown) => Promise<{ content: string; isError: boolean; endTurn?: string }>;
    fits: (runningUsd: number) => boolean;
    now?: () => number;
    sleep?: (ms: number) => Promise<void>;
};
export type EngineUsage = { input: number; output: number; cacheRead: number; cacheWrite: number; costUsd: number; toolCalls: { name: string; ok: boolean }[] };
export type EngineResult =
    | { ok: true; messages: Msg[]; reply: string; fixed: boolean; usage: EngineUsage; ended: boolean }
    | { ok: false; usage: EngineUsage; cause: unknown };

const KNOWN = new Set<string>([...CUSTOMER_TOOL_NAMES, ...OPTIONAL_TOOL_NAMES]);
const ENDS_TURN = new Set<string>(END_TURN_TOOL_NAMES);

/**
 * lessons: what staff taught the assistant, a second cached block (it changes only when a lesson is saved).
 * facts: per-turn facts from our records, last and uncached so the blocks before it stay cached.
 */
export async function runShopTurn(
    args: { messages: Msg[]; system: string; lessons?: string | null; facts?: string | null; tools: Anthropic.Tool[]; model: string },
    deps: EngineDeps,
): Promise<EngineResult> {
    const now = deps.now ?? Date.now;
    const started = now();
    const messages: Msg[] = [...args.messages];
    const usage: EngineUsage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, costUsd: 0, toolCalls: [] };
    // Only the tools this turn was given: the optional ones are on WhatsApp only, and only when switched on.
    const allowed = new Set(args.tools.map(t => t.name).filter(n => KNOWN.has(n)));
    let reply = "";
    let fixed: string | null = null;   // one of our own lines: shown as is
    let ended: string | null = null;   // a tool sent the message and closed the turn with this text

    try {
        for (let i = 0; i < MAX_ITERATIONS; i++) {
            const remaining = BUDGET_MS - (now() - started);
            if (remaining < 8_000) { fixed = LINES.slow; break; }
            if (!deps.fits(usage.costUsd)) { fixed = LINES.cantChat; break; }
            // At a sales rush Claude can turn calls away for a moment: retry those, briefly, inside the budget.
            const call = () => {
                const left = BUDGET_MS - (now() - started);
                const timeoutMs = Math.min(CALL_TIMEOUT_MS, left - 2_000);
                return deps.client.messages.create(
                    {
                        model: args.model,
                        max_tokens: MAX_TOKENS,
                        system: [
                            { type: "text", text: args.system, cache_control: { type: "ephemeral" } },
                            ...(args.lessons ? [{ type: "text", text: args.lessons, cache_control: { type: "ephemeral" } }] : []),
                            ...(args.facts ? [{ type: "text", text: args.facts }] : []),
                        ],
                        tools: args.tools,
                        tool_choice: { type: "auto" },
                        thinking: { type: "adaptive" },
                        output_config: { effort: "medium" },
                        cache_control: { type: "ephemeral" },
                        messages,
                    } as any,
                    { timeout: timeoutMs, maxRetries: 0, signal: AbortSignal.timeout(timeoutMs + 1_000) },
                ) as Promise<Anthropic.Message>;
            };
            let response: Anthropic.Message;
            for (let attempt = 0; ; attempt++) {
                try { response = await call(); break; } catch (e) {
                    const wait = RETRY_WAITS_MS[attempt];
                    if (wait === undefined || !retryable(e) || BUDGET_MS - (now() - started) - wait < RETRY_MIN_LEFT_MS) throw e;
                    console.warn("[shop-assistant] Claude busy; retrying", { attempt: attempt + 1, status: (e as { status?: number }).status ?? null });
                    await (deps.sleep ?? (ms => new Promise(r => setTimeout(r, ms))))(wait);
                }
            }

            usage.input += response.usage.input_tokens;
            usage.output += response.usage.output_tokens;
            usage.cacheRead += response.usage.cache_read_input_tokens ?? 0;
            usage.cacheWrite += response.usage.cache_creation_input_tokens ?? 0;
            usage.costUsd += costUsd(response.usage);

            const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
            if (response.stop_reason === "refusal") { fixed = LINES.refusal; break; }
            // A tool call we won't answer (truncated, paused, out of context) never enters the transcript.
            if (toolUses.length > 0 && response.stop_reason !== "tool_use") { fixed = LINES.slow; break; }

            // A blank text block is rejected by the API on every later turn.
            messages.push({ role: "assistant", content: response.content.filter(b => !(b.type === "text" && !b.text.trim())) });

            if (response.stop_reason === "tool_use" && toolUses.length > 0) {
                // One at a time, in order: the caps and lockouts read and write shared chat state.
                const results: Anthropic.ToolResultBlockParam[] = [];
                for (const t of toolUses) {
                    // A tool that sends the message must come last, on its own, or it would ask before the answers are in.
                    const outcome: { content: string; isError: boolean; endTurn?: string } = !allowed.has(t.name)
                        ? { content: "That isn't available here.", isError: true }
                        : ENDS_TURN.has(t.name) && toolUses.length > 1
                            ? { content: `Call ${t.name} on its own, after the other tools have answered.`, isError: true }
                            : await deps.runTool(t.name, t.input);
                    usage.toolCalls.push({ name: t.name, ok: !outcome.isError });
                    results.push({ type: "tool_result" as const, tool_use_id: t.id, content: outcome.content, ...(outcome.isError ? { is_error: true } : {}) });
                    if (!outcome.isError && outcome.endTurn) ended = outcome.endTurn;
                }
                messages.push({ role: "user", content: results });
                if (ended !== null) {
                    // Any text written before the tool call goes out ahead of the question.
                    reply = response.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map(b => b.text).join("\n").trim();
                    break;
                }
                if (i === MAX_ITERATIONS - 1) fixed = LINES.slow;
                continue;
            }

            reply = response.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map(b => b.text).join("\n").trim();
            break;
        }
    } catch (cause) {
        return { ok: false, usage, cause };
    }

    // A turn a tool closed may have no text of its own; unusable text is dropped rather than replaced.
    const preface = ended !== null && reply ? safeReply(reply) : "";
    const text = fixed ?? (ended !== null ? (preface === LINES.generic ? "" : preface) : safeReply(reply));
    // Keep the transcript alternating: a turn that stopped on tool results
    // (or before answering) is closed by what the customer was told.
    // A blank text block is rejected by the API on every later turn, so drop them first.
    const tail = messages[messages.length - 1];
    if (tail?.role === "assistant" && Array.isArray(tail.content)) {
        messages[messages.length - 1] = { ...tail, content: tail.content.filter(b => !(b.type === "text" && !b.text.trim())) };
    }
    const last = messages[messages.length - 1];
    if (last?.role === "user") messages.push({ role: "assistant", content: [{ type: "text", text: ended ?? text }] });
    else if (last && Array.isArray(last.content) && !last.content.some(b => b.type === "text" && b.text.trim())) {
        // An assistant message with no text (empty reply) would 400 every later turn.
        messages[messages.length - 1] = { ...last, content: [...last.content, { type: "text", text }] };
    }
    // The model's text being unusable (raw, empty) is a fixed line too: the customer gets the WhatsApp button.
    return { ok: true, messages, reply: text, fixed: fixed !== null || text === LINES.generic, usage, ended: ended !== null };
}
