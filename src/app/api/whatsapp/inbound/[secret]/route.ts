// Chatbots Africa callback URL (set as the chatbot's POST callback in their
// dashboard). Capture only: each delivery is stored raw in inbound_events so
// the payload format can be read off real traffic. Nothing is parsed, no AI
// runs and nothing is sent from here yet. Capture runs whether or not
// whatsapp_enabled is on; processing, when it lands, is gated on that switch.
//
// The path secret is the only gate. A wrong or missing secret, or an unset or
// short WHATSAPP_INBOUND_SECRET, is a 404 that stores nothing. Never log the
// request URL: it carries the secret.
import { after, NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { IpGate } from "@/lib/ai/shopAssistant/limits";
import { clientIp, inboundSecretMatches, MAX_INBOUND_BYTES, readCapped, redactHeaders } from "@/lib/whatsapp/inbound";

export const dynamic = "force-dynamic";

const PROVIDER = "chatbots_africa";
/** Per instance and per address. Generous: a provider delivers from a few addresses. */
const ipGate = new IpGate(300, 60_000);

type Ctx = { params: Promise<{ secret: string }> };

const notFound = () => new NextResponse("Not found", { status: 404 });

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
        return new NextResponse("Too many requests", { status: 429 });
    }

    const rawBody = await readCapped(req, MAX_INBOUND_BYTES);
    if (rawBody === null) {
        console.warn("[whatsapp-inbound] body over the size cap, not stored", { declared: req.headers.get("content-length") });
        return new NextResponse("Payload too large", { status: 413 });
    }
    const headers = redactHeaders(req.headers);

    // Answer at once; the provider must never wait on our database.
    after(async () => {
        try {
            const { error } = await supabaseAdmin.from("inbound_events").insert({
                provider: PROVIDER, raw_body: rawBody, headers, source_ip: ip,
            });
            if (error) console.error("[whatsapp-inbound] could not store event", { code: error.code, message: error.message });
        } catch (e) {
            console.error("[whatsapp-inbound] could not store event", { err: String(e) });
        }
    });
    return NextResponse.json({ status: "ok" });
}
