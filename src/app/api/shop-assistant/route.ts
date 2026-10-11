// Ask Miss Tokyo: the shop's customer chat. Public endpoint — these checks are
// the only gate. Every calm outcome is a 200 with { reply, buttons }.
import { after, NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAiSettings } from "@/lib/ai/settings";
import { logCause } from "@/lib/errors/apiError";
import { recordErrorEvent } from "@/lib/errors/errorEvents";
import { cleanPlace } from "@/lib/errors/errorPlace";
import { runShopAssistant } from "@/lib/ai/shopAssistant/run";
import { createChat, loadChat, shopWhatsappNumber, visitorCounts, visitorKeyFor } from "@/lib/ai/shopAssistant/store";
import { cleanCustomerText, identityFor, IpGate, IP_PER_MINUTE, MAX_TEXT, sameOrigin, visitorOver } from "@/lib/ai/shopAssistant/limits";
import { talkButton, waSummary } from "@/lib/ai/shopAssistant/format";
import { LINES } from "@/lib/ai/shopAssistant/lines";
import type { ShopButton } from "@/lib/ai/shopAssistant/types";

export const maxDuration = 90;

const COOKIE = "mt_chat";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ipGate = new IpGate(IP_PER_MINUTE, 60_000);

function out(req: NextRequest, body: { reply: string; buttons: ShopButton[] }, status = 200, cookieId?: string) {
    const res = NextResponse.json(body, { status });
    if (cookieId) {
        res.cookies.set(COOKIE, cookieId, {
            httpOnly: true, sameSite: "lax", secure: req.nextUrl.protocol === "https:", path: "/", maxAge: 30 * 86_400,
        });
    }
    return res;
}

function gate(req: NextRequest): { reply: string; status: number } | null {
    if (!sameOrigin({ origin: req.headers.get("origin"), fetchSite: req.headers.get("sec-fetch-site") }, req.nextUrl.origin)) {
        return { reply: LINES.refresh, status: 403 };
    }
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    if (!ipGate.allow(ip, Date.now())) return { reply: LINES.slowDown, status: 429 };
    return null;
}

async function identity() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return identityFor(null, null);
    const { data: p } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).maybeSingle();
    return identityFor(user.id, (p?.role as string | null) ?? null);
}

export async function POST(req: NextRequest) {
    const blocked = gate(req);
    if (blocked) return out(req, { reply: blocked.reply, buttons: [] }, blocked.status);
    let talk: ShopButton[] = [];
    try {
        const raw = await req.text();
        if (raw.length > 2048) return out(req, { reply: LINES.tooLong, buttons: [] }, 413);
        let body: any = null;
        try { body = JSON.parse(raw); } catch { body = null; }

        const settings = await getAiSettings();
        const wa = await shopWhatsappNumber(settings);
        const t = talkButton(wa, waSummary({ topic: null, orderRef: null }));
        talk = t ? [t] : [];
        if (!settings.shop.enabled || !process.env.ANTHROPIC_API_KEY) return out(req, { reply: LINES.cantChat, buttons: talk });

        if (typeof body?.text === "string" && body.text.trim().length > MAX_TEXT) return out(req, { reply: LINES.tooLong, buttons: [] }, 400);
        const text = cleanCustomerText(body?.text);
        if (!text) return out(req, { reply: LINES.empty, buttons: [] }, 400);

        const who = await identity();
        const cookieId = req.cookies.get(COOKIE)?.value;
        let chat = cookieId && UUID.test(cookieId) ? await loadChat(cookieId) : null;
        let newCookie: string | undefined;
        if (!chat) {
            const id = crypto.randomUUID();
            chat = await createChat({ id, visitorKey: visitorKeyFor(id), customerId: who.customerId });
            newCookie = id;
        }
        if (chat.customerId && chat.customerId !== who.customerId) {
            // Someone else's chat (shared device, sign-out, another account): never reuse it. The visitor carries over.
            const id = crypto.randomUUID();
            chat = await createChat({ id, visitorKey: chat.visitorKey, customerId: who.customerId });
            newCookie = id;
        }
        if (who.customerId && !chat.customerId) chat = { ...chat, customerId: who.customerId };

        const counts = await visitorCounts(chat.visitorKey);
        if (!counts || visitorOver({ ...counts, perDay: settings.shop.dailyMessagesPerVisitor })) {
            return out(req, { reply: LINES.cantChat, buttons: talk }, 200, newCookie);
        }

        const result = await runShopAssistant({ channel: "web", identity: who, chat, text, settings, whatsappNumber: wa });
        if (result.failed) {
            after(async () => {
                const place = cleanPlace(req.headers.get("referer"));
                if (place) await recordErrorEvent("SHOP-01", place, "customer");
            });
        }
        return out(req, { reply: result.reply, buttons: result.buttons }, 200, newCookie);
    } catch (e) {
        logCause("SHOP-01", e, { route: "shop-assistant" });
        return out(req, { reply: LINES.generic, buttons: talk });
    }
}

/** New chat: a new cookie id. The visitor (and their daily count) carries over. */
export async function DELETE(req: NextRequest) {
    const blocked = gate(req);
    if (blocked) return NextResponse.json({ ok: false }, { status: blocked.status });
    try {
        const old = req.cookies.get(COOKIE)?.value;
        const prev = old && UUID.test(old) ? await loadChat(old) : null;
        const id = crypto.randomUUID();
        await createChat({ id, visitorKey: prev?.visitorKey ?? visitorKeyFor(id), customerId: prev?.customerId ?? null });
        const res = NextResponse.json({ ok: true });
        res.cookies.set(COOKIE, id, { httpOnly: true, sameSite: "lax", secure: req.nextUrl.protocol === "https:", path: "/", maxAge: 30 * 86_400 });
        return res;
    } catch (e) {
        logCause("SHOP-01", e, { route: "shop-assistant DELETE" });
        return NextResponse.json({ ok: false }, { status: 200 });
    }
}

/** Whether the chat is on, and where Talk to us goes. Cached for a minute. */
export async function GET() {
    try {
        const settings = await getAiSettings();
        const wa = await shopWhatsappNumber(settings);
        const t = talkButton(wa, waSummary({ topic: null, orderRef: null }));
        return NextResponse.json(
            { enabled: settings.shop.enabled && !!process.env.ANTHROPIC_API_KEY, whatsappHref: t && "href" in t ? t.href : null },
            { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60" } },
        );
    } catch (e) {
        logCause("SHOP-01", e, { route: "shop-assistant GET" });
        return NextResponse.json({ enabled: false, whatsappHref: null });
    }
}
