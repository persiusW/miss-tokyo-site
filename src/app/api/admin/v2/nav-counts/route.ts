// Side-nav counts for admin v2: Inbox shows conversations that need a person,
// Orders shows paid orders waiting to pack. Same rules as the pages they open
// (lib/admin/v2/counts.ts, shared with Home).
import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/ai/requireStaff";
import { apiError } from "@/lib/errors/apiError";
import { inboxBreakdown, toPackCount } from "@/lib/admin/v2/counts";

export const dynamic = "force-dynamic";

export async function GET() {
    const auth = await requireStaff();
    if ("status" in auth) return apiError("AUTH-01", { status: auth.status, audience: "staff" });
    try {
        const [orders, inbox] = await Promise.all([toPackCount(), inboxBreakdown(auth.role)]);
        return NextResponse.json({ orders, inbox: inbox.total });
    } catch (cause) {
        return apiError("GEN-00", { status: 500, audience: "staff", cause });
    }
}
