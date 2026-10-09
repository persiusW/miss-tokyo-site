// Tool registry. Order is fixed: the tool list is part of the cached prompt.
import type Anthropic from "@anthropic-ai/sdk";
import { catalogTools } from "./catalog";
import { orderTools } from "./orders";
import { salesTools } from "./sales";
import { messageTools } from "./messages";
import { checkoutTools } from "./checkout";
import { helpTools } from "./help";
import { err, type StaffRole, type ToolContext, type ToolOutcome } from "./shared";
import { redactText } from "@/lib/ai/missTokyoAi/scrub";

export type { ToolContext, ToolOutcome } from "./shared";

const TOOLS = [...catalogTools, ...orderTools, ...salesTools, ...messageTools, ...checkoutTools, ...helpTools];

export function toolDefsFor(role: StaffRole): Anthropic.Tool[] {
    return TOOLS.filter(t => !t.roles || t.roles.includes(role)).map(t => t.def);
}

/** Never throws. Tool output is redacted except create_order's payment link. */
export async function runTool(name: string, input: any, ctx: ToolContext): Promise<ToolOutcome> {
    const tool = TOOLS.find(t => t.def.name === name && (!t.roles || t.roles.includes(ctx.role)));
    if (!tool) return err(`Unknown tool "${name}".`);
    try {
        const out = await tool.run(input, ctx);
        return name === "create_order" ? out : { ...out, content: redactText(out.content) };
    } catch (e) {
        console.error(`[miss-tokyo-ai] tool ${name} failed`, e);
        return err("That lookup failed. Try again, or check the dashboard directly.");
    }
}
