import { test, expect } from "@playwright/test";
import type Anthropic from "@anthropic-ai/sdk";
import { dropPastThinking } from "../../../src/lib/ai/pastThinking";

// Shape of a stored chat that failed in production on 2026-10-14: thinking
// blocks signed under an older system prompt were replayed after it changed.
const transcript: Anthropic.MessageParam[] = [
    { role: "user", content: "Do you have dresses in M?" },
    { role: "assistant", content: [
        { type: "thinking", thinking: "look up dresses", signature: "sig-old" },
        { type: "tool_use", id: "t1", name: "find_products", input: { category: "dresses", size: "M" } },
    ] },
    { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: "{}" }] },
    { role: "assistant", content: [
        { type: "redacted_thinking", data: "x" },
        { type: "text", text: "Yes, size M is in stock." },
    ] },
    { role: "assistant", content: [{ type: "thinking", thinking: "only thinking", signature: "s" }] },
];

test("earlier turns are replayed without thinking; everything else is untouched", () => {
    const out = dropPastThinking(transcript);
    expect(JSON.stringify(out)).not.toMatch(/"type":"(redacted_)?thinking"/);
    expect(out[0]).toBe(transcript[0]);
    expect(out[1].content).toEqual([{ type: "tool_use", id: "t1", name: "find_products", input: { category: "dresses", size: "M" } }]);
    expect(out[2]).toBe(transcript[2]);
    expect(out[3].content).toEqual([{ type: "text", text: "Yes, size M is in stock." }]);
    // A turn left empty keeps its shape.
    expect(out[4].content).toEqual([{ type: "text", text: "…" }]);
    // The stored transcript itself is not changed.
    expect((transcript[1].content as any[])[0].type).toBe("thinking");
});
