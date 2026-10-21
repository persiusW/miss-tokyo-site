// The model calls behind teaching: turning a correction or a hint into one
// standing lesson, and describing a flashcard photo with a guess at which
// product it is. Metered in ai_turns as dashboard spend (so the daily cap and
// its alerts cover them), at most TEACH_PER_HOUR per staff member, and refused
// when the day's AI budget is spent. Server-only.
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { AI_MODEL, costUsd } from "@/lib/ai/pricing";
import { getAiSettings } from "@/lib/ai/settings";
import { todaySpendUsd, withinCap } from "@/lib/ai/spend";
import { aiPausedByMonthlyCap } from "@/lib/billing/statements";
import { BODY_MAX, lessonError, TITLE_MAX } from "./lessonRules";

export const TEACH_PER_HOUR = 30;
type TeachCall = "teach_correction" | "teach_hint" | "teach_photo";
const db = supabaseAdmin as any;

/** A teaching call that may not run now; calm is the staff-facing line (our own words, never provider text). */
export class TeachLimit extends Error {
    constructor(readonly calm: string) { super(calm); }
}

/** Throws TeachLimit with a staff-facing line when this call may not run now. */
async function guard(userId: string): Promise<void> {
    if (!process.env.ANTHROPIC_API_KEY) throw new TeachLimit("The assistant can't learn right now. Please try again later.");
    const since = new Date(Date.now() - 3600_000).toISOString();
    const { data, error } = await db.from("ai_turns").select("tool_calls")
        .eq("user_id", userId).eq("channel", "dashboard").gte("created_at", since).limit(500);
    if (error) throw error;
    const used = (data ?? []).filter((r: any) => Array.isArray(r.tool_calls) && r.tool_calls.some((t: any) => String(t?.name ?? "").startsWith("teach_"))).length;
    if (used >= TEACH_PER_HOUR) throw new TeachLimit("That's a lot of teaching for one hour. Please try again a little later.");
    if (await aiPausedByMonthlyCap()) throw new TeachLimit("This month's AI spending cap has been reached, so teaching is paused. The owner can raise it in Billing.");
    const settings = await getAiSettings();
    const spent = await todaySpendUsd();
    if (spent === null || !withinCap({ capGhs: settings.dailySpendCapGhs, spentTodayUsd: spent, runningUsd: 0, reserveUsd: 0.05 })) {
        throw new TeachLimit("Today's AI budget is used up. Please try again tomorrow.");
    }
}

async function meter(userId: string, kind: TeachCall, usage: Anthropic.Usage, ok: boolean): Promise<void> {
    const { error } = await db.from("ai_turns").insert({
        channel: "dashboard", user_id: userId, model: AI_MODEL,
        input_tokens: usage.input_tokens, output_tokens: usage.output_tokens,
        cache_read_tokens: usage.cache_read_input_tokens ?? 0, cache_write_tokens: usage.cache_creation_input_tokens ?? 0,
        cost_usd: parseFloat(costUsd(usage).toFixed(6)), tool_calls: [{ name: kind, ok }],
    });
    if (error) console.error("[teach] could not meter a call", { code: error.code });
}

/** One structured call; the parsed JSON, or null when the model gave nothing usable. */
async function askJson<T>(userId: string, kind: TeachCall, system: string, content: Anthropic.ContentBlockParam[], schema: object): Promise<T | null> {
    await guard(userId);
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 1 });
    const res = await client.messages.create({
        model: AI_MODEL, max_tokens: 2000, system,
        messages: [{ role: "user", content }],
        output_config: { effort: "low", format: { type: "json_schema", schema } },
    } as any, { timeout: 30_000 }) as Anthropic.Message;
    let parsed: T | null = null;
    if (res.stop_reason !== "refusal") {
        const text = res.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? "";
        try { parsed = JSON.parse(text) as T; } catch { parsed = null; }
    }
    await meter(userId, kind, res.usage, parsed !== null);
    return parsed;
}

const LESSON_SCHEMA = {
    type: "object", additionalProperties: false, required: ["title", "body"],
    properties: { title: { type: "string" }, body: { type: "string" } },
};

const DISTILL_SYSTEM = `You help the owner of Miss Tokyo, a women's fashion boutique in Accra, teach their shop assistant (a chatbot that serves customers on WhatsApp and the website).
Turn what the owner gives you into ONE standing fact the assistant should remember for every customer.
- Never tell a story about one customer, and never include a customer's name or number.
- Never include a price, a fee, a time, a date, a stock count or which sizes are in stock: those come from the shop's live data.
- Write it as a fact or a rule in plain English, as the shop would say it ("Our pieces run small; suggest one size up for bodycon dresses.").
- title: a few words naming the topic, under ${TITLE_MAX - 20} characters. body: one or two short sentences, under ${BODY_MAX - 100} characters.
Answer in JSON with "title" and "body".`;

export type Draft = { title: string; body: string };

function cleanDraft(d: Draft | null): Draft | null {
    if (!d || typeof d.title !== "string" || typeof d.body !== "string") return null;
    const draft = { title: d.title.trim().slice(0, TITLE_MAX), body: d.body.trim().slice(0, BODY_MAX) };
    return lessonError(draft.title, draft.body) ? null : draft;
}

/** A lesson drafted from a correction of one reply; null when the model's draft won't do (staff then write it). */
export async function distillCorrection(userId: string, a: { customerWrote: string | null; assistantSaid: string; rightAnswer: string; why: string }): Promise<Draft | null> {
    const text = [
        a.customerWrote ? `The customer wrote: "${a.customerWrote.slice(0, 600)}"` : "",
        `The assistant replied: "${a.assistantSaid.slice(0, 1200)}"`,
        `What it should have said: "${a.rightAnswer.slice(0, 600)}"`,
        a.why ? `Why, the rule to remember: "${a.why.slice(0, 400)}"` : "",
    ].filter(Boolean).join("\n");
    return cleanDraft(await askJson<Draft>(userId, "teach_correction", DISTILL_SYSTEM, [{ type: "text", text }], LESSON_SCHEMA));
}

/** A lesson from a note staff gave the assistant in one chat; null unless the model made a clean one. */
export async function distillHint(userId: string, note: string): Promise<Draft | null> {
    const text = `The owner told the assistant this, in one customer's chat: "${note.slice(0, 1000)}"\nIf it holds for every customer, make it the lesson. If it is only about this one customer, still write the general rule behind it.`;
    return cleanDraft(await askJson<Draft>(userId, "teach_hint", DISTILL_SYSTEM, [{ type: "text", text }], LESSON_SCHEMA));
}

export type PhotoGuess = { description: string; productIndex: number };

const PHOTO_SYSTEM = `You look at a photo the owner of Miss Tokyo (a women's fashion boutique) took or saved of one of their pieces, often a social media post of a model wearing it.
- description: one neutral sentence describing only what is visible about the piece: type, colour, fabric look, neckline, length, details. No brand guesses, nothing about the person.
- product_number: the number of the product in the list that this piece most likely is, or 0 when none fits.
Answer in JSON with "description" and "product_number".`;

/** Describes a flashcard photo and guesses which listed product it is (1-based index, 0 = none). */
export async function describePhoto(userId: string, jpegBase64: string, products: { name: string; sku: string | null }[]): Promise<PhotoGuess | null> {
    const list = products.map((p, i) => `${i + 1}. ${p.name}${p.sku ? ` (SKU ${p.sku})` : ""}`).join("\n");
    const r = await askJson<{ description: string; product_number: number }>(userId, "teach_photo", PHOTO_SYSTEM, [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: jpegBase64 } },
        { type: "text", text: `The shop's products:\n${list}` },
    ], {
        type: "object", additionalProperties: false, required: ["description", "product_number"],
        properties: { description: { type: "string" }, product_number: { type: "integer" } },
    });
    if (!r || typeof r.description !== "string") return null;
    const n = Number.isInteger(r.product_number) && r.product_number >= 1 && r.product_number <= products.length ? r.product_number : 0;
    return { description: r.description.trim().replace(/\s+/g, " ").slice(0, 220), productIndex: n };
}
