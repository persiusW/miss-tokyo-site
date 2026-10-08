// Meta WhatsApp Cloud API webhook. Phase 2 skeleton: verifies and logs only.
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(req: NextRequest) {
    const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");
    if (verifyToken && mode === "subscribe" && token === verifyToken) {
        return new NextResponse(challenge, { status: 200 });
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/** Constant-time check of Meta's X-Hub-Signature-256 over the raw body. */
function signatureValid(body: string, header: string, secret: string): boolean {
    const expected = Buffer.from("sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex"));
    const given = Buffer.from(header);
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

export async function POST(req: NextRequest) {
    const appSecret = process.env.META_APP_SECRET;
    const body = await req.text();

    if (!appSecret) {
        // Not configured yet. Acknowledge so Meta does not retry for days.
        console.warn("[whatsapp-webhook] META_APP_SECRET not set — ignoring delivery");
        return NextResponse.json({ status: "ok" });
    }
    if (!signatureValid(body, req.headers.get("x-hub-signature-256") ?? "", appSecret)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let payload: any;
    try {
        payload = JSON.parse(body);
    } catch {
        return NextResponse.json({ status: "ok" });
    }

    const messages: any[] = payload?.entry?.[0]?.changes?.[0]?.value?.messages ?? [];
    for (const message of messages) {
        // No message text in logs, and only the last 4 digits of the sender.
        const from = String(message?.from ?? "");
        console.log("[whatsapp-webhook] inbound", {
            from: from ? `***${from.slice(-4)}` : null,
            type: message?.type ?? "unknown",
            id: message?.id ?? null,
        });
    }
    // TODO Phase 3: pass to the conversation orchestrator.
    return NextResponse.json({ status: "ok" });
}
