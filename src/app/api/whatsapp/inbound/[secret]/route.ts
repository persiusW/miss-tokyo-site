// Chatbots Africa callback URL (set as the chatbot's POST callback in their
// dashboard). Chatbots Africa NEVER retries a callback: whatever we fail to
// store here is lost for good. So the raw event is written to inbound_events
// before we answer, a failed write keeps retrying after the response, and
// nothing that could fail (parsing, AI, sending) runs before the 200.
//
// Capture always runs. Processing (in after(), never before the 200) needs
// whatsapp_enabled on and a parser registered; until then events are stored
// only. Whatever fails here is retried by the inbound sweep cron.
//
// The path secret is the only gate. A wrong or missing secret, or an unset or
// short WHATSAPP_INBOUND_SECRET, is a 404 that stores nothing. Never log the
// request URL: it carries the secret.
import { after, NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { IpGate } from "@/lib/ai/shopAssistant/limits";
import { getAiSettings } from "@/lib/ai/settings";
import { clientIp, inboundSecretMatches, MAX_INBOUND_BYTES, readCapped, redactHeaders } from "@/lib/whatsapp/inbound";
import { processInboundEvent } from "@/lib/whatsapp/pipeline";
import { pipelineFor } from "@/lib/whatsapp/processing";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PROVIDER = "chatbots_africa";
/**
 * Per instance and per address. High on purpose: a refused delivery is never
 * resent, so this only stops a flood from someone holding the secret.
 */
const ipGate = new IpGate(1000, 60_000);
/** Waits between write retries after the response has gone. */
const RETRY_DELAYS_MS = [1_000, 3_000, 9_000];

type Ctx = { params: Promise<{ secret: string }> };
type EventRow = { provider: string; raw_body: string; headers: Record<string, string>; source_ip: string | null; error?: string };

// inbound_events is not in the generated types until the migration is applied.
const db = supabaseAdmin as any;

const notFound = () => new NextResponse("Not found", { status: 404 });
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function store(row: EventRow): Promise<string | null> {
    try {
        const { data, error } = await db.from("inbound_events").insert(row).select("id").single();
        if (error) { console.error("[whatsapp-inbound] store failed", { code: error.code, message: error.message }); return null; }
        return data?.id ?? null;
    } catch (e) {
        console.error("[whatsapp-inbound] store failed", { err: String(e) });
        return null;
    }
}

/** Some providers check the URL with a GET before saving it. */
export async function GET(_req: NextRequest, { params }: Ctx) {
    const { secret } = await params;
    if (!inboundSecretMatches(secret, process.env.WHATSAPP_INBOUND_SECRET)) return notFound();
    return new NextResponse("ok", { status: 200, headers: { "Content-Type": "text/plain" } });
}

export async function POST(req: NextRequest, { params }: Ctx) {
    const { secret } = await params;
    if (!inboundSecretMatches(secret, process.env.WHATSAPP_INBOUND_SECRET)) return notFound();

    const ip = clientIp(req.headers);
    if (!ipGate.allow(ip ?? "unknown", Date.now())) {
        console.error("[whatsapp-inbound] rate limited: delivery dropped and will not be resent");
        return new NextResponse("Too many requests", { status: 429 });
    }

    const headers = redactHeaders(req.headers);
    const rawBody = await readCapped(req, MAX_INBOUND_BYTES);
    // An oversized delivery is still recorded, as a marker, so staff can see one went missing.
    const row: EventRow = rawBody === null
        ? { provider: PROVIDER, raw_body: "", headers, source_ip: ip, error: `body over ${MAX_INBOUND_BYTES} bytes (declared ${req.headers.get("content-length") ?? "unknown"})` }
        : { provider: PROVIDER, raw_body: rawBody, headers, source_ip: ip };

    // Persist first. Only a failed write waits on anything after the response.
    const id = await store(row);
    if (id && rawBody !== null) {
        after(async () => {
            try {
                const settings = await getAiSettings();
                const pipeline = pipelineFor(PROVIDER, settings.whatsappEnabled);
                if (pipeline) await processInboundEvent(id, pipeline);
            } catch (e) {
                // Stored already: the sweep picks it up.
                console.error("[whatsapp-inbound] processing failed; left for the sweep", { err: String(e) });
            }
        });
    }
    if (!id) {
        after(async () => {
            for (const wait of RETRY_DELAYS_MS) {
                await sleep(wait);
                if (await store(row)) return;
            }
            // Bytes only: message text and phone numbers stay out of the logs.
            console.error("[whatsapp-inbound] EVENT LOST after retries", { bytes: row.raw_body.length });
        });
    }
    return NextResponse.json({ status: "ok" });
}
