// Reply myself: staff write to the customer from the inbox, from the shop's
// WhatsApp line. The chat goes to the team and the assistant stays quiet in it
// until it is handed back. Order staff (admin, owner, sales staff).
import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/ai/requireStaff";
import { logCause } from "@/lib/errors/apiError";
import { staffName } from "@/lib/whatsapp/events";
import { composerOn } from "@/lib/whatsapp/flags";
import { sendAsStaff } from "@/lib/whatsapp/staffSend";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
    const auth = await requireStaff(["admin", "owner", "sales_staff"]);
    if ("status" in auth) return NextResponse.json({ error: auth.status === 401 ? "Please sign in again." : "Only order staff can reply to WhatsApp chats." }, { status: auth.status });
    if (!composerOn()) return NextResponse.json({ error: "Replying from here is switched off. Reply from your WhatsApp phone." }, { status: 403 });
    const { id } = await params;
    if (!UUID.test(id)) return NextResponse.json({ error: "That chat isn't there any more. Please refresh." }, { status: 404 });
    const body = await req.json().catch(() => null);
    try {
        const r = await sendAsStaff({
            conversationId: id, text: String(body?.text ?? ""), staffId: auth.userId,
            staffName: await staffName(auth.userId).catch(() => null), takeOver: true,
        });
        return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: r.status });
    } catch (e) {
        logCause("GEN-00", e, { route: "whatsapp/inbox/[id]/reply" });
        return NextResponse.json({ error: "We couldn't send that. Please try again." }, { status: 500 });
    }
}
