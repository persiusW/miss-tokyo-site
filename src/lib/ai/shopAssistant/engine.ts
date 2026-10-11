// The shop assistant's model loop. Pure: the model client, the tools and the
// spend check are injected, so it is unit-tested with a fake client.
import type Anthropic from "@anthropic-ai/sdk";
import { costUsd } from "@/lib/ai/pricing";
import { CUSTOMER_TOOL_NAMES } from "./toolDefs";
import { LINES, safeReply } from "./lines";

const MAX_ITERATIONS = 8;
const MAX_TOKENS = 8000;
const BUDGET_MS = 70_000;
const CALL_TIMEOUT_MS = 40_000;

type Msg = Anthropic.MessageParam;
export type EngineDeps = {
    client: Pick<Anthropic, "messages">;
    runTool: (name: string, input: unknown) => Promise<{ content: string; isError: boolean }>;
    fits: (runningUsd: number) => boolean;
    now?: () => number;
};
export type EngineUsage = { input: number; output: number; cacheRead: number; cacheWrite: number; costUsd: number; toolCalls: { name: string; ok: boolean }[] };
export type EngineResult =
    | { ok: true; messages: Msg[]; reply: string; fixed: boolean; usage: EngineUsage }
    | { ok: false; usage: EngineUsage; cause: unknown };

const ALLOWED = new Set<string>(CUSTOMER_TOOL_NAMES);

export async function runShopTurn(args: { messages: Msg[]; system: string; tools: Anthropic.Tool[]; model: string }, deps: EngineDeps): Promise<EngineResult> {
    const now = deps.now ?? Date.now;
    const started = now();
    const messages: Msg[] = [...args.messages];
    const usage: EngineUsage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, costUsd: 0, toolCalls: [] };
    let reply = "";
    let fixed: string | null = null;   // one of our own lines: shown as is

    try {
        for (let i = 0; i < MAX_ITERATIONS; i++) {
            const remaining = BUDGET_MS - (now() - started);
            if (remaining < 8_000) { fixed = LINES.slow; break; }
            if (!deps.fits(usage.costUsd)) { fixed = LINES.cantChat; break; }
            const timeoutMs = Math.min(CALL_TIMEOUT_MS, remaining - 2_000);
            const response = await deps.client.messages.create(
                {
                    model: args.model,
                    max_tokens: MAX_TOKENS,
                    system: [{ type: "text", text: args.system, cache_control: { type: "ephemeral" } }],
                    tools: args.tools,
                    tool_choice: { type: "auto" },
                    thinking: { type: "adaptive" },
                    output_config: { effort: "medium" },
                    cache_control: { type: "ephemeral" },
                    messages,
                } as any,
                { timeout: timeoutMs, maxRetries: 0, signal: AbortSignal.timeout(timeoutMs + 1_000) },
            ) as Anthropic.Message;

            usage.input += response.usage.input_tokens;
            usage.output += response.usage.output_tokens;
            usage.cacheRead += response.usage.cache_read_input_tokens ?? 0;
            usage.cacheWrite += response.usage.cache_creation_input_tokens ?? 0;
            usage.costUsd += costUsd(response.usage);

            const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
            if (response.stop_reason === "refusal") { fixed = LINES.refusal; break; }
            // A tool call we won't answer (truncated, paused, out of context) never enters the transcript.
            if (toolUses.length > 0 && response.stop_reason !== "tool_use") { fixed = LINES.slow; break; }

            messages.push({ role: "assistant", content: response.content });

            if (response.stop_reason === "tool_use" && toolUses.length > 0) {
                // One at a time, in order: the caps and lockouts read and write shared chat state.
                const results: Anthropic.ToolResultBlockParam[] = [];
                for (const t of toolUses) {
                    const outcome = ALLOWED.has(t.name)
                        ? await deps.runTool(t.name, t.input)
                        : { content: "That isn't available here.", isError: true };
                    usage.toolCalls.push({ name: t.name, ok: !outcome.isError });
                    results.push({ type: "tool_result" as const, tool_use_id: t.id, content: outcome.content, ...(outcome.isError ? { is_error: true } : {}) });
                }
                messages.push({ role: "user", content: results });
                if (i === MAX_ITERATIONS - 1) fixed = LINES.slow;
                continue;
            }

            reply = response.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map(b => b.text).join("\n").trim();
            break;
        }
    } catch (cause) {
        return { ok: false, usage, cause };
    }

    const text = fixed ?? safeReply(reply);
    // Keep the transcript alternating: a turn that stopped on tool results
    // (or before answering) is closed by what the customer was told.
    const last = messages[messages.length - 1];
    if (last?.role === "user") messages.push({ role: "assistant", content: [{ type: "text", text }] });
    else if (last && Array.isArray(last.content) && !last.content.some(b => b.type === "text" && b.text.trim())) {
        // An assistant message with no text (empty reply) would 400 every later turn.
        messages[messages.length - 1] = { ...last, content: [...last.content, { type: "text", text }] };
    }
    return { ok: true, messages, reply: text, fixed: fixed !== null, usage };
}
