// One flashcard round: its cards (GET), guessing the next ones (POST
// { action: "guess" }, polled while photos are left), and staff's answer for a
// card (POST { action: "answer", cardId, verdict, productId?, why? }). Admin and owner.
import { NextRequest, NextResponse } from "next/server";
import { logCause } from "@/lib/errors/apiError";
import { answerCard, guessRound, roundCards } from "@/lib/ai/teach/photoCards";
import { TeachLimit } from "@/lib/ai/teach/teachModel";
import { teacher } from "../../guard";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Ctx = { params: Promise<{ roundId: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
    const who = await teacher();
    if (who instanceof NextResponse) return who;
    const { roundId } = await params;
    if (!UUID.test(roundId)) return NextResponse.json({ error: "Those photos aren't there any more." }, { status: 404 });
    try {
        return NextResponse.json({ cards: await roundCards(roundId) });
    } catch (e) {
        logCause("GEN-00", e, { route: "whatsapp/teach/photos/[roundId] GET" });
        return NextResponse.json({ error: "We couldn't load those photos. Please refresh." }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: Ctx) {
    const who = await teacher();
    if (who instanceof NextResponse) return who;
    const { roundId } = await params;
    if (!UUID.test(roundId)) return NextResponse.json({ error: "Those photos aren't there any more." }, { status: 404 });
    const body = await req.json().catch(() => null);
    try {
        if (body?.action === "guess") {
            const left = await guessRound(roundId, who.staffId);
            return NextResponse.json({ left, cards: await roundCards(roundId) });
        }
        if (body?.action === "answer") {
            const verdict = body?.verdict;
            if (!UUID.test(String(body?.cardId ?? "")) || !["correct", "wrong", "skip"].includes(verdict)) {
                return NextResponse.json({ error: "Please refresh and try again." }, { status: 400 });
            }
            const r = await answerCard({
                cardId: body.cardId, verdict, productId: typeof body.productId === "string" ? body.productId : null,
                why: typeof body.why === "string" ? body.why : null, ...who,
            });
            return r.ok ? NextResponse.json(r) : NextResponse.json({ error: r.error }, { status: 400 });
        }
        return NextResponse.json({ error: "Please refresh and try again." }, { status: 400 });
    } catch (e) {
        if (e instanceof TeachLimit) return NextResponse.json({ error: e.calm }, { status: 429 });
        logCause("GEN-00", e, { route: "whatsapp/teach/photos/[roundId] POST" });
        return NextResponse.json({ error: "Something happened with those photos. Please try again." }, { status: 500 });
    }
}
