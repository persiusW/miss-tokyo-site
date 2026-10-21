// Inbox › Teach the assistant: how many active products have a photo flashcard
// and how many don't yet. Teachers only (admin, owner), like the rest of Teach.
import { NextResponse } from "next/server";
import { apiError } from "@/lib/errors/apiError";
import { flashcardCoverage } from "@/lib/admin/v2/inboxLoad";
import { teacher } from "@/app/api/whatsapp/teach/guard";

export const dynamic = "force-dynamic";

export async function GET() {
    const who = await teacher();
    if (who instanceof NextResponse) return who;
    try {
        return NextResponse.json(await flashcardCoverage());
    } catch (cause) {
        return apiError("GEN-00", { status: 500, audience: "staff", cause, context: { route: "admin/v2/inbox/flashcards" } });
    }
}
