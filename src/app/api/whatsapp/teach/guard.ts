// Who may teach the assistant: admin and owner, with teaching switched on.
import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/ai/requireStaff";
import { staffName } from "@/lib/whatsapp/events";
import { teachOn } from "@/lib/whatsapp/flags";

export async function teacher(): Promise<{ staffId: string; staffName: string | null } | NextResponse> {
    const auth = await requireStaff(["admin", "owner"]);
    if ("status" in auth) {
        return NextResponse.json({ error: auth.status === 401 ? "Please sign in again." : "Only the owner and admins can teach the assistant." }, { status: auth.status });
    }
    if (!teachOn()) return NextResponse.json({ error: "Teaching the assistant is switched off." }, { status: 403 });
    return { staffId: auth.userId, staffName: await staffName(auth.userId).catch(() => null) };
}
