// POST /api/billing/dashttp/webhook: Dashttp tells Miss Tokyo about plan
// charges, invoices and receipts. Signed (X-Dashttp-Signature, HMAC-SHA256
// with DASHTTP_WEBHOOK_SECRET), checked in constant time; idempotent by
// event id, so Dashttp's retries on a non-2xx change nothing twice.
import { NextResponse } from "next/server";
import { applyDashttpEvent, parseEvent, verifyDashttpSignature } from "@/lib/billing/dashttpWebhook";

export async function POST(req: Request) {
    const raw = await req.text();
    if (!process.env.DASHTTP_WEBHOOK_SECRET) return NextResponse.json({ ok: false }, { status: 503 });
    if (!verifyDashttpSignature(raw, req.headers.get("x-dashttp-signature"), process.env.DASHTTP_WEBHOOK_SECRET)) {
        return NextResponse.json({ ok: false }, { status: 401 });
    }
    const ev = parseEvent(raw, req.headers.get("x-dashttp-event-id"));
    if (!ev) return NextResponse.json({ ok: false }, { status: 400 });
    const r = await applyDashttpEvent(ev);
    // A failure to store asks Dashttp to retry; a duplicate is a success.
    if (r === "failed") return NextResponse.json({ ok: false }, { status: 500 });
    return NextResponse.json({ ok: true, duplicate: r === "duplicate" });
}
