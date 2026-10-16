// offer_choices: a question the customer answers by tapping. The tool only
// checks and records the choices; the WhatsApp handler sends them after the
// turn, and the turn ends on the question.
import { offeredText, planChoices } from "@/lib/whatsapp/choices";
import { err, type ShopToolContext, type ToolOutcome } from "./context";

export async function offerChoices(input: any, ctx: ShopToolContext): Promise<ToolOutcome> {
    if (ctx.channel !== "whatsapp") return err("That isn't available here.");
    const plan = planChoices(input?.question, input?.options);
    if ("error" in plan) return err(plan.error);
    ctx.choices = plan;
    return {
        content: JSON.stringify({ sent: plan.kind, note: "Sent. Say nothing else; their tap comes back as [tapped: option]." }),
        isError: false,
        endTurn: offeredText(plan),
    };
}
