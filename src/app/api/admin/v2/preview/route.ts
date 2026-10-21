// Turn the new admin on or off for this device only. Owners and admins can
// preview it before the store-wide switch; the cookie changes which pages
// render, never what anyone may do (every page and action checks the role).
import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/ai/requireStaff";
import { apiError } from "@/lib/errors/apiError";
import { PREVIEW_COOKIE } from "@/lib/admin/v2/flags";

export async function POST(req: Request) {
    const auth = await requireStaff(["admin", "owner"]);
    if ("status" in auth) return apiError("AUTH-01", { status: auth.status, audience: "staff" });
    let on = false;
    try { on = (await req.json())?.on === true; } catch { /* treat as off */ }
    const res = NextResponse.json({ on });
    if (on) res.cookies.set(PREVIEW_COOKIE, "1", { path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30 });
    else res.cookies.set(PREVIEW_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
}
