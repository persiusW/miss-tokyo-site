// Admin v2 Inbox list: contact forms, custom requests (while that feature is
// on) and, for the admin only, the questions Miss Tokyo AI sent them. WhatsApp
// chats load from /api/whatsapp/inbox. `needs` is the side-nav Inbox count
// (lib/admin/v2/counts.ts), so the chip and the nav always agree.
//   ?f=needs|all|whatsapp|form|request|ai  ?q=search  ?limit=per source (25–500)
import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/ai/requireStaff";
import { apiError } from "@/lib/errors/apiError";
import { inboxBreakdown } from "@/lib/admin/v2/counts";
import { isFilter } from "@/lib/admin/v2/inbox";
import { customRequestsOn, emailReplyOn, loadSources } from "@/lib/admin/v2/inboxLoad";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const auth = await requireStaff();
    if ("status" in auth) return apiError("AUTH-01", { status: auth.status, audience: "staff" });
    const url = new URL(req.url);
    const f = url.searchParams.get("f");
    const filter = isFilter(f) ? f : "needs";
    const limit = Math.min(500, Math.max(25, Number(url.searchParams.get("limit")) || 50));
    try {
        const showRequests = await customRequestsOn();
        const [list, needs] = await Promise.all([
            loadSources({ role: auth.role, filter, q: url.searchParams.get("q") ?? "", limit, showRequests }),
            inboxBreakdown(auth.role),
        ]);
        return NextResponse.json({ ...list, needs, showRequests, emailReply: emailReplyOn(), role: auth.role });
    } catch (cause) {
        return apiError("GEN-00", { status: 500, audience: "staff", cause, context: { route: "admin/v2/inbox", filter } });
    }
}
