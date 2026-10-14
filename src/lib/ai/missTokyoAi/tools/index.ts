// Tool registry. Order is fixed: the tool list is part of the cached prompt.
import type Anthropic from "@anthropic-ai/sdk";
import { catalogTools } from "./catalog";
import { orderTools } from "./orders";
import { statsTools } from "./stats";
import { reportingTools } from "./reporting";
import { paymentTools } from "./payments";
import { messageTools } from "./messages";
import { checkoutTools } from "./checkout";
import { helpTools } from "./help";
import { err, type StaffRole, type ToolContext, type ToolOutcome } from "./shared";
import { redactText } from "@/lib/ai/missTokyoAi/scrub";
import type { MtaiFeatures } from "@/lib/ai/settings";

export type { ToolContext, ToolOutcome } from "./shared";

const TOOLS = [...catalogTools, ...orderTools, ...statsTools, ...reportingTools, ...paymentTools, ...messageTools, ...checkoutTools, ...helpTools];

const available = (t: (typeof TOOLS)[number], role: StaffRole, features: MtaiFeatures) =>
    (!t.roles || t.roles.includes(role)) && (!t.feature || features[t.feature]);

export function toolDefsFor(role: StaffRole, features: MtaiFeatures): Anthropic.Tool[] {
    return TOOLS.filter(t => available(t, role, features)).map(t => t.def);
}

/** Never throws. Tool output is redacted except create_order's payment link. */
export async function runTool(name: string, input: any, ctx: ToolContext): Promise<ToolOutcome> {
    const tool = TOOLS.find(t => t.def.name === name && available(t, ctx.role, ctx.features));
    if (!tool) return err(`Unknown tool "${name}".`);
    try {
        const out = await tool.run(input, ctx);
        return name === "create_order" ? out : { ...out, content: redactText(out.content) };
    } catch (e) {
        console.error(`[miss-tokyo-ai] tool ${name} failed`, e);
        return err("That lookup failed. Try again, or check the dashboard directly.");
    }
}
