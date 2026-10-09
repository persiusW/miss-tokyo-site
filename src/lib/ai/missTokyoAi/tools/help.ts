// Help tools: buttons, not actions. Each adds a validated effect; the person
// taps it. The enums come from the registries, so the model cannot invent a
// route or a control.
import { navigateEffect, showMeEffect } from "@/lib/ai/missTokyoAi/effects";
import { ANCHORS } from "@/lib/ai/missTokyoAi/anchors";
import { ROUTES, SETTINGS_TABS } from "@/lib/ai/missTokyoAi/routes";
import { err, ok, str, type ToolDef } from "./shared";

export const helpTools: ToolDef[] = [
    {
        def: {
            name: "navigate_to",
            description: "Give staff a 'Take me there' button to a dashboard page (and, for Site Settings, a tab). Use whenever you tell someone where something is.",
            input_schema: {
                type: "object",
                properties: {
                    page: { type: "string", enum: Object.keys(ROUTES) },
                    tab: { type: "string", enum: [...SETTINGS_TABS], description: "Only for page=settings." },
                },
                required: ["page"],
            },
        },
        async run(input, ctx) {
            const effect = navigateEffect(str(input?.page, 40), ctx.role, str(input?.tab, 40) || null);
            if (!effect) return err("That page isn't available to this person. Tell them to ask an admin or owner.");
            ctx.effects.push(effect);
            return ok({ button: effect.label });
        },
    },
    {
        def: {
            name: "show_me",
            description: "Give staff a 'Show me' button that opens the page and highlights a specific control. Only these controls can be highlighted.",
            input_schema: {
                type: "object",
                properties: { control: { type: "string", enum: Object.keys(ANCHORS) } },
                required: ["control"],
            },
        },
        async run(input, ctx) {
            const effect = showMeEffect(str(input?.control, 60), ctx.role);
            if (!effect) return err("That control isn't available to this person. Describe where it is instead.");
            ctx.effects.push(effect);
            return ok({ button: effect.label });
        },
    },
];
