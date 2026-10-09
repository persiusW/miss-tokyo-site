// Help tools: buttons, not actions. Each adds a validated effect; the person
// taps it. The enums come from the registries, so the model cannot invent a
// route or a control.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { navigateEffect, sendToAdminEffect, showMeEffect, walkthroughEffect } from "@/lib/ai/missTokyoAi/effects";
import { WALKTHROUGHS } from "@/lib/ai/missTokyoAi/walkthroughs";
import { SHOW_ME_ANCHORS } from "@/lib/ai/missTokyoAi/anchors";
import { ROUTES, SETTINGS_TABS } from "@/lib/ai/missTokyoAi/routes";
import { guideFor } from "@/lib/ai/missTokyoAi/guide";
import { searchDocs, type SearchDoc } from "@/lib/ai/missTokyoAi/guideSearch";
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
                properties: { control: { type: "string", enum: SHOW_ME_ANCHORS } },
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
    {
        def: {
            name: "find_in_guide",
            description: "Search the dashboard guide and the answers the Miss Tokyo team has saved for staff. Use it before saying you don't know how something works. A result with source \"saved\" is the team's own answer: give it, starting with \"From the Miss Tokyo team:\".",
            input_schema: {
                type: "object",
                properties: { query: { type: "string", description: "The question in a few words." } },
                required: ["query"],
            },
        },
        async run(input, ctx) {
            const query = str(input?.query, 200);
            if (!query) return err("Say what to look for.");
            const { data, error } = await supabaseAdmin
                .from("ai_saved_answers")
                .select("id, title, body")
                .eq("active", true)
                .contains("roles", [ctx.role])
                .limit(500);
            if (error) console.error("[miss-tokyo-ai] saved answers unavailable", error);
            const docs: SearchDoc[] = [
                ...(data ?? []).map(a => ({ id: a.id, title: a.title, body: a.body, source: "saved" as const })),
                ...guideFor(ctx.role).map(e => ({ id: e.id, title: e.title, body: e.body, source: "guide" as const })),
            ];
            const hits = searchDocs(query, docs);
            if (hits.length === 0) return ok({ results: [], note: "Nothing in the guide or the team's saved answers matches." });
            return ok({ results: hits.map(h => ({ source: h.source, title: h.title, text: h.body })) });
        },
    },
    {
        // Admin answers the inbox, so only owners and sales staff send to it.
        roles: ["owner", "sales_staff"],
        feature: "sendToAdmin",
        def: {
            name: "send_to_admin",
            description: "When neither the tools nor find_in_guide can answer, offer a \"Send to admin\" button. Nothing is sent unless the person taps it; the admin's reply then appears in this chat. Write the question as the person would ask it, in one or two sentences.",
            input_schema: {
                type: "object",
                properties: { question: { type: "string", description: "The question for the admin, at most 300 characters." } },
                required: ["question"],
            },
        },
        async run(input, ctx) {
            const effect = sendToAdminEffect(input?.question);
            if (!effect) return err("Write the question in a sentence.");
            ctx.effects.push(effect);
            return ok({ button: "Send to admin", note: "Tell them they can tap Send to admin and the reply will come back here." });
        },
    },
    {
        feature: "walkthroughs",
        def: {
            name: "start_walkthrough",
            description: `When someone asks how to do one of these, answer in a line or two and call this so they get a "Start walkthrough" button that highlights each control in turn: ${WALKTHROUGHS.map(w => `${w.id} (${w.title})`).join("; ")}.`,
            input_schema: {
                type: "object",
                properties: { walkthrough: { type: "string", enum: WALKTHROUGHS.map(w => w.id) } },
                required: ["walkthrough"],
            },
        },
        async run(input, ctx) {
            const effect = walkthroughEffect(str(input?.walkthrough, 40), ctx.role);
            if (!effect) return err("That walkthrough isn't available to this person. Describe the steps instead.");
            ctx.effects.push(effect);
            return ok({ button: effect.label });
        },
    },
];
