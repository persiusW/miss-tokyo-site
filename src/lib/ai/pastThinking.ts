// Thinking blocks are signed against the exact request they were made in
// (system prompt included). Replayed in a later turn after the prompt
// changed — a deploy that edits the prompt, or WhatsApp adding the
// customer's number — the API refuses the whole request ("Invalid signature
// in thinking block … bound to a different conversation"). The model needs no
// thinking from earlier, finished turns; only an in-progress tool loop needs
// its own, and that never comes from a stored transcript. So history sent with
// a new customer message carries no thinking blocks.
import type Anthropic from "@anthropic-ai/sdk";

type Msg = Anthropic.MessageParam;
const THINKING = new Set(["thinking", "redacted_thinking"]);

export function dropPastThinking<M extends Msg>(messages: M[]): M[] {
    return messages.map(m => {
        if (m.role !== "assistant" || !Array.isArray(m.content)) return m;
        const kept = m.content.filter(b => !THINKING.has((b as { type: string }).type));
        if (kept.length === m.content.length) return m;
        // A finished turn always has text or a tool call; keep the turn shape if not.
        return { ...m, content: kept.length > 0 ? kept : [{ type: "text", text: "…" }] } as M;
    });
}
